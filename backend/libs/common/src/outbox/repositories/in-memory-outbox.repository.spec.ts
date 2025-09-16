import { InMemoryOutboxRepository } from './in-memory-outbox.repository';
import { testOutboxRepositoryContract } from '../outbox.repository.spec';

describe('InMemoryOutboxRepository', () => {
  // Run the shared contract tests

  const repository = new InMemoryOutboxRepository();
  testOutboxRepositoryContract(
    'In-Memory Implementation',
    async () => {
      return repository;
    },
    {beforeEach: () => repository.clear()}
    // No cleanup needed for in-memory implementation
  );
});
