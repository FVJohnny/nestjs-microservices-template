import { Outbox_InMemory_Repository } from './outbox.in-memory-repository';
import { testOutboxRepositoryContract } from '../domain/outbox.repository.contract';

describe('Outbox_InMemory_Repository', () => {
  // Run the shared contract tests

  const repository = new Outbox_InMemory_Repository();
  testOutboxRepositoryContract(
    'In-Memory Implementation',
    async () => {
      return repository;
    },
    { beforeEach: () => repository.clear() },
    // No cleanup needed for in-memory implementation
  );
});
