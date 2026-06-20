module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'utils/**/*.js',
    'middleware/**/*.js',
    'services/**/*.js',
    'controllers/**/*.js',
  ],
  coverageDirectory: 'coverage',
  // Phase 2 target — raise these as coverage grows:
  // coverageThreshold: { global: { branches: 50, functions: 50, lines: 60, statements: 60 } },
  verbose: true,
};
