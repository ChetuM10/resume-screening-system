/**
 * Jest configuration for Resume Screening System
 */
module.exports = {
  preset: '@shelf/jest-mongodb',
  testEnvironment: 'node',
  verbose: true,
  testTimeout: 20000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup/setup.js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    'utils/**/*.js',
    '!node_modules/**',
    '!tests/**',
    '!coverage/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  // Ensure tests run serially to avoid database conflicts
  maxWorkers: 1
};
