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
    '^@libs/nestjs-common(.*)$': '<rootDir>/../../../libs/nestjs/common/src$1',
    '^@libs/nestjs-kafka(.*)$': '<rootDir>/../../../libs/nestjs/kafka/src$1',
    '^@libs/nestjs-mongodb(.*)$': '<rootDir>/../../../libs/nestjs/mongodb/src$1',
    '^@libs/nestjs-redis(.*)$': '<rootDir>/../../../libs/nestjs/redis/src$1',
    '^@libs/nestjs-postgresql(.*)$': '<rootDir>/../../../libs/nestjs/postgresql/src$1',
    '^express$': '<rootDir>/../node_modules/express/index.js'
  }
};