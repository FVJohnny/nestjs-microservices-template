import { pathsToModuleNameMapper } from 'ts-jest';
import tsConfigBase from '../../../../tsconfig.base.json' with { type: 'json' };

const { compilerOptions: baseCompilerOptions } = tsConfigBase;

export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e.spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/../src/$1',
    ...pathsToModuleNameMapper(baseCompilerOptions.paths || {}, { prefix: '<rootDir>/../' }),
  },
};
