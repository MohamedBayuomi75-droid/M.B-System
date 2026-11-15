/* jsast.js — أدوات تحليل JS بدون مكتبات (بتستخدم acorn المدمج في Node)
   التشغيل: node --expose-internals tools/merge/<script>.js
   مستخدمة في أدوات دمج الدفتر (codemod) — مش جزء من البرنامج نفسه. */
const acorn = require('internal/deps/acorn/acorn/dist/acorn');
const walk = require('internal/deps/acorn/acorn-walk/dist/walk');
const fs = require('fs');

function parse(code, file) {
  try {
    return acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', locations: false, ranges: false, allowHashBang: true });
  } catch (e) { throw new Error('parse error in ' + file + ': ' + e.message); }
}

/** أسماء الإعلانات على مستوى الملف (function / let / const / var / class) */
function topLevelDecls(ast) {
  const out = [];
  for (const n of ast.body) {
    if (n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') out.push({ name: n.id.name, kind: n.type === 'FunctionDeclaration' ? 'function' : 'class', node: n });
    else if (n.type === 'VariableDeclaration') {
      for (const d of n.declarations) collectPatternNames(d.id).forEach(nm => out.push({ name: nm, kind: n.kind, node: n, declarator: d }));
    }
  }
  return out;
}
function collectPatternNames(p, acc = []) {
  if (!p) return acc;
  switch (p.type) {
    case 'Identifier': acc.push(p.name); break;
    case 'ObjectPattern': p.properties.forEach(pr => collectPatternNames(pr.type === 'RestElement' ? pr.argument : pr.value, acc)); break;
    case 'ArrayPattern': p.elements.forEach(e => e && collectPatternNames(e, acc)); break;
    case 'AssignmentPattern': collectPatternNames(p.left, acc); break;
    case 'RestElement': collectPatternNames(p.argument, acc); break;
  }
  return acc;
}

/**
 * يرجّع كل الـ Identifier اللي هي "أسماء متغيرات" (مش مفاتيح خصائص ولا أسماء خصائص بعد نقطة).
 * كل عنصر: { name, node, role: 'ref'|'decl'|'shorthand-key', prop }  (prop موجود للخاصية المختصرة)
 */
function variableIdentifiers(ast) {
  const res = [];
  const skip = new Set();   // Identifier nodes that are NOT variables
  walk.full(ast, (node) => {
    if (node.type === 'MemberExpression' && !node.computed) skip.add(node.property);
    if (node.type === 'Property' && !node.computed && !node.shorthand) skip.add(node.key);
    if ((node.type === 'MethodDefinition' || node.type === 'PropertyDefinition') && !node.computed) skip.add(node.key);
    if (node.type === 'LabeledStatement' || node.type === 'BreakStatement' || node.type === 'ContinueStatement') { if (node.label) skip.add(node.label); }
  });
  const shorthand = new Map();   // value identifier -> Property
  walk.full(ast, (node) => {
    if (node.type === 'Property' && node.shorthand) {
      let v = node.value;
      if (v.type === 'AssignmentPattern') v = v.left;
      shorthand.set(v, node);
      skip.add(node.key);       // key node shares text with value; we handle through the property
    }
  });
  walk.full(ast, (node) => {
    if (node.type === 'Identifier' && !skip.has(node)) {
      res.push({ name: node.name, node, prop: shorthand.get(node) || null });
    }
  });
  return res;
}

module.exports = { acorn, walk, parse, topLevelDecls, collectPatternNames, variableIdentifiers, fs };

/* ------------------------------------------------------------------
   تحليل النطاقات: الأسماء "الحرة" (اللي بتتقرا من برا الملف / من النطاق العام)
   ------------------------------------------------------------------ */
function isNode(x) { return x && typeof x === 'object' && typeof x.type === 'string'; }
function children(node) {
  const out = [];
  for (const k of Object.keys(node)) {
    if (k === 'type' || k === 'start' || k === 'end') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach(x => isNode(x) && out.push([k, x]));
    else if (isNode(v)) out.push([k, v]);
  }
  return out;
}
function patternNames(p, acc) { return collectPatternNames(p, acc || []); }

/** كل الأسماء المعرّفة مباشرة داخل نطاق دالة (params + var + function) أو بلوك (let/const/class/function) */
function scopeBindings(node, isFunctionScope) {
  const names = new Set();
  const addDecl = (n) => {
    if (n.type === 'VariableDeclaration') n.declarations.forEach(d => patternNames(d.id).forEach(x => names.add(x)));
    else if ((n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') && n.id) names.add(n.id.name);
  };
  if (isFunctionScope) {
    (node.params || []).forEach(p => patternNames(p).forEach(x => names.add(x)));
    if (node.type === 'FunctionExpression' && node.id) names.add(node.id.name);
    names.add('arguments');
    // var + function declarations anywhere inside (not crossing function boundaries)
    const visit = (n) => {
      for (const [, c] of children(n)) {
        if (c.type === 'FunctionDeclaration') { if (c.id) names.add(c.id.name); continue; }
        if (c.type === 'FunctionExpression' || c.type === 'ArrowFunctionExpression') continue;
        if (c.type === 'VariableDeclaration' && c.kind === 'var') c.declarations.forEach(d => patternNames(d.id).forEach(x => names.add(x)));
        visit(c);
      }
    };
    const body = node.body;
    if (body && body.type === 'BlockStatement') { body.body.forEach(addDecl); visit(body); }
    else if (body) visit({ type: 'X', body });
  } else {
    // بلوك / Program: let/const/class/function المباشرة
    const list = node.body || node.consequent || [];
    (Array.isArray(list) ? list : []).forEach(addDecl);
  }
  return names;
}

function freeVariables(ast) {
  const free = new Map();
  const nonVar = new Set();
  walk.full(ast, (n) => {
    if (n.type === 'MemberExpression' && !n.computed) nonVar.add(n.property);
    if (n.type === 'Property' && !n.computed && !n.shorthand) nonVar.add(n.key);
    if ((n.type === 'MethodDefinition' || n.type === 'PropertyDefinition') && !n.computed) nonVar.add(n.key);
    if ((n.type === 'LabeledStatement' || n.type === 'BreakStatement' || n.type === 'ContinueStatement') && n.label) nonVar.add(n.label);
  });
  const programBound = new Set();
  ast.body.forEach(n => {
    if (n.type === 'VariableDeclaration') n.declarations.forEach(d => patternNames(d.id).forEach(x => programBound.add(x)));
    else if ((n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') && n.id) programBound.add(n.id.name);
  });
  // var داخل بلوكات على مستوى Program
  (function visitVar(n) { for (const [, c] of children(n)) { if (c.type === 'FunctionDeclaration' || c.type === 'FunctionExpression' || c.type === 'ArrowFunctionExpression') continue; if (c.type === 'VariableDeclaration' && c.kind === 'var') c.declarations.forEach(d => patternNames(d.id).forEach(x => programBound.add(x))); visitVar(c); } })(ast);

  function resolve(name, stack) { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].has(name)) return true; return false; }
  function visit(node, stack) {
    switch (node.type) {
      case 'Identifier':
        if (!nonVar.has(node) && !resolve(node.name, stack)) free.set(node.name, (free.get(node.name) || 0) + 1);
        return;
      case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': {
        const sc = scopeBindings(node, true);
        const st = stack.concat([sc]);
        // params defaults + body
        (node.params || []).forEach(p => visit(p, st));
        if (node.body) visit(node.body, st);
        return;
      }
      case 'BlockStatement': { const st = stack.concat([scopeBindings(node, false)]); node.body.forEach(c => visit(c, st)); return; }
      case 'SwitchStatement': { visit(node.discriminant, stack); const all = new Set(); node.cases.forEach(cs => scopeBindings({ body: cs.consequent }, false).forEach(x => all.add(x))); const st = stack.concat([all]); node.cases.forEach(cs => { if (cs.test) visit(cs.test, st); cs.consequent.forEach(c => visit(c, st)); }); return; }
      case 'ForStatement': case 'ForInStatement': case 'ForOfStatement': {
        const names = new Set(); const init = node.init || node.left;
        if (init && init.type === 'VariableDeclaration') init.declarations.forEach(d => patternNames(d.id).forEach(x => names.add(x)));
        const st = stack.concat([names]);
        children(node).forEach(([, c]) => visit(c, st)); return;
      }
      case 'CatchClause': { const names = new Set(); if (node.param) patternNames(node.param).forEach(x => names.add(x)); const st = stack.concat([names]); if (node.param) visit(node.param, st); visit(node.body, st); return; }
      case 'ClassDeclaration': case 'ClassExpression': { const names = new Set(); if (node.id) names.add(node.id.name); const st = stack.concat([names]); children(node).forEach(([, c]) => visit(c, st)); return; }
      case 'Property':
        if (node.shorthand) { visit(node.value.type === 'AssignmentPattern' ? node.value.right : node.value, stack); if (node.value.type === 'AssignmentPattern') visit(node.value.left, stack); return; }
        break;
    }
    children(node).forEach(([, c]) => visit(c, stack));
  }
  visit(ast, [programBound]);
  // الأسماء المعرّفة على مستوى Program مش "حرة" بالنسبة للملف نفسه، لكن لازم نرجّعها منفصلة عشان نعرف مين بيعتمد على مين
  return free;
}
module.exports.freeVariables = freeVariables;
module.exports.isNode = isNode;
