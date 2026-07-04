module.exports = {
  displayName: 'web-poblacion-data-access',
  preset: '../../../../jest.preset.js',
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/src/test-setup.ts', 'fake-indexeddb/auto'],
  transform: {
    '^.+\\.(ts|mjs|js)$': [
      'jest-preset-angular',
      { tsconfig: '<rootDir>/tsconfig.spec.json', isolatedModules: true },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../../coverage/libs/web/poblacion/data-access',
};
