import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * حدود الطبقات (TARGET_ARCHITECTURE §4) للموديولات المبنية بالبنية الجديدة (المرحلة 4 وما بعدها):
 *  - Controller: مايستوردش Repository ولا TypeORM/DataSource ولا pg (مفيش SQL في الـ API).
 *  - Service: مايكتبش SQL ومايستوردش DataSource مباشرة (بيكلم الـ Repository بتاعه أو TransactionRunner).
 *  - Repository: مايستوردش Service ولا Controller.
 *  - موديول مايستوردش Repository موديول تاني (بيستخدم الـ Service المعلن بس).
 * أي موديول جديد بيتضاف للقائمة دي.
 */
const LAYERED_MODULES = ['projects', 'workers', 'people', 'leaves', 'dailies', 'dues', 'equipment', 'costs', 'approvals', 'history', 'parties', 'finance-rules', 'stock', 'warehouses'];
const SRC = path.join(__dirname);

describe('architecture: layer boundaries for layered modules', () => {
  for (const mod of LAYERED_MODULES) {
    const dir = path.join(SRC, mod);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
    const imports = (f: string) => [...fs.readFileSync(path.join(dir, f), 'utf8').matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
    const src = (f: string) => fs.readFileSync(path.join(dir, f), 'utf8');

    it(`${mod}: has the four layers (controller, service, repository, module)`, () => {
      for (const kind of ['controller', 'service', 'repository', 'module']) expect(files.some((f) => f.endsWith(`.${kind}.ts`))).toBe(true);
    });
    it(`${mod}: controllers do not touch data access`, () => {
      for (const f of files.filter((x) => x.endsWith('.controller.ts'))) {
        expect(imports(f).filter((i) => /repository|typeorm|^pg$|\/database\//.test(i))).toEqual([]);
        expect(src(f)).not.toMatch(/\b(SELECT|INSERT|UPDATE|DELETE)\b/);
      }
    });
    it(`${mod}: services contain no SQL and no direct DataSource`, () => {
      for (const f of files.filter((x) => x.endsWith('.service.ts'))) {
        expect(imports(f).filter((i) => /^typeorm$|@nestjs\/typeorm|^pg$/.test(i))).toEqual([]);
        expect(src(f)).not.toMatch(/\b(SELECT|INSERT INTO|UPDATE \w+ SET|DELETE FROM)\b/);
      }
    });
    it(`${mod}: repositories do not depend on services/controllers`, () => {
      for (const f of files.filter((x) => x.endsWith('.repository.ts'))) expect(imports(f).filter((i) => /\.(service|controller)$/.test(i))).toEqual([]);
    });
    it(`${mod}: no imports of another module's repository`, () => {
      for (const f of files) expect(imports(f).filter((i) => /\.repository$/.test(i) && !i.startsWith('./'))).toEqual([]);
    });
  }
});
