module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  // Scope coverage to the modules under test (expand as suites are added).
  collectCoverageFrom: [
    'utils/redact.js',
    'middleware/auth.js',
    'services/report/signAndHash.js',
    'services/report/certManager.js',
    'controllers/authController.js',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: { branches: 25, functions: 55, lines: 55, statements: 55 },
  },
  verbose: true,
};
