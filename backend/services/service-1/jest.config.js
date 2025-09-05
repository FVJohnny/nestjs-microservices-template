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
    '^@libs/nestjs-common(.*)$': '<rootDir>/../../../libs/common/src$1',
    '^@libs/nestjs-kafka(.*)$': '<rootDir>/../../../libs/kafka/src$1',
    '^@libs/nestjs-mongodb(.*)$': '<rootDir>/../../../libs/mongodb/src$1',
    '^@libs/nestjs-redis(.*)$': '<rootDir>/../../../libs/redis/src$1',
    '^@libs/nestjs-postgresql(.*)$': '<rootDir>/../../../libs/postgresql/src$1',
    '^express$': '<rootDir>/../node_modules/express/index.js'
  }
};