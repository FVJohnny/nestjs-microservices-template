// Test-only exports to avoid runtime issues
// This file should only be imported in test files

// Import from source for tests - types will be compatible at runtime
export { testCriteriaConverterContract, type TestEntityDTO } from './src/general/domain/criteria/criteria-converter.spec';
export { testOutboxRepositoryContract } from './src/outbox/outbox.repository.spec';