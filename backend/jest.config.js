/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  collectCoverageFrom: ['**/*.js', '!**/node_modules/**', '!**/test/**'],
};
