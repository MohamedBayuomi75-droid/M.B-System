// unit: بدون داتابيز.  e2e: محتاج PostgreSQL حقيقي (DATABASE_URL أو متغيرات DB_*) — بينشئ قاعدة مؤقتة ويمسحها.
const tsJest = ['ts-jest', { tsconfig: 'tsconfig.json' }];
module.exports = {
  // testTimeout جوّه projects بيتجاهل (خيار global) — أول ملف e2e بيشغّل كل الهجرات على قاعدة جديدة وبياخد أكتر من 5 ثواني
  testTimeout: 60000,
  projects: [
    { displayName: 'unit', testEnvironment: 'node', rootDir: '.', testMatch: ['<rootDir>/src/**/*.spec.ts'], setupFiles: ['reflect-metadata'], transform: { '^.+\\.ts$': tsJest } },
    { displayName: 'e2e', testEnvironment: 'node', rootDir: '.', testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'], setupFiles: ['reflect-metadata'], transform: { '^.+\\.ts$': tsJest } },
  ],
};
