// unit: بدون داتابيز.  e2e: محتاج PostgreSQL حقيقي (DATABASE_URL أو متغيرات DB_*) — بينشئ قاعدة مؤقتة ويمسحها.
const tsJest = ['ts-jest', { tsconfig: 'tsconfig.json' }];
module.exports = {
  projects: [
    { displayName: 'unit', testEnvironment: 'node', rootDir: '.', testMatch: ['<rootDir>/src/**/*.spec.ts'], setupFiles: ['reflect-metadata'], transform: { '^.+\\.ts$': tsJest } },
    { displayName: 'e2e', testEnvironment: 'node', rootDir: '.', testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'], setupFiles: ['reflect-metadata'], testTimeout: 60000, transform: { '^.+\\.ts$': tsJest } },
  ],
};
