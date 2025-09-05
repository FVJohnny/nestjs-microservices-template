module.exports = {
  displayName: 'nestjs-postgresql',
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
  passWithNoTests: true
};