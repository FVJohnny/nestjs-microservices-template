const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../tsconfig.json');

module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testEnvironment: "node",
  testRegex: ".e2e.spec.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/../src/$1",
    ...pathsToModuleNameMapper(compilerOptions.paths || {}, { prefix: '<rootDir>/../' })
  }
};