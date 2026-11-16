# syntax=docker/dockerfile:1
# سيرفر النظام الموحد — build متعدد المراحل (Node 22 LTS، alpine). الـ context = جذر المشروع (السيرفر + الواجهة القديمة)
FROM node:22-alpine AS build
WORKDIR /app
COPY server/package.json server/package-lock.json ./
# شهادة CA اختيارية لبيئات خلف proxy بيفك TLS (مش بتتنسخ للصورة النهائية):
#   docker build --secret id=npm_ca,src=/path/ca.crt --build-arg HTTPS_PROXY=... ...
RUN --mount=type=secret,id=npm_ca,required=false \
    if [ -f /run/secrets/npm_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npm_ca; npm config set cafile /run/secrets/npm_ca; fi; \
    npm ci --no-audit --no-fund
COPY server/tsconfig.json server/tsconfig.build.json ./
COPY server/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server/package.json ./
# الواجهة القديمة (A4): /legacy/* من نفس السيرفر — renderer/ زي ما هو + web/ (الجلسة والمزامنة) + vendor/ (xlsx)
COPY --chown=node:node renderer ./legacy/renderer
COPY --chown=node:node web ./legacy/web
COPY --chown=node:node vendor ./legacy/vendor
COPY --chown=node:node icon.ico ./legacy/icon.ico
ENV LEGACY_UI_ROOT=/app/legacy
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3000}/api/health >/dev/null || exit 1
# PID 1: Compose بيشغّل init (tini المدمج في Docker) — init: true
CMD ["node", "dist/main.js"]
