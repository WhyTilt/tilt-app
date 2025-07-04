module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/unit/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/main.js' // Skip main process for unit tests
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};