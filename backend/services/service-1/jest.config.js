const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions: baseCompilerOptions } = require('../../../tsconfig.base.json');

// Set log level to error only during tests
process.env.LOG_LEVEL = 'error';

module.exports = {
  displayName: 'service-1',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  collectCoverageFrom: [
    '**/*.(t|j)s'
  ],
  coverageDirectory: '../coverage',
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    ...pathsToModuleNameMapper(baseCompilerOptions.paths || {}, { prefix: '<rootDir>/../' }),
    '^express$': '<rootDir>/../node_modules/express/index.js'
  }
};