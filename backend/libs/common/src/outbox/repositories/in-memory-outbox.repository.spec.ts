import { InMemoryOutboxRepository } from './in-memory-outbox.repository';
import { testOutboxRepositoryContract } from '../outbox.repository.spec';

describe('InMemoryOutboxRepository', () => {
  // Run the shared contract tests
  testOutboxRepositoryContract(
    'In-Memory Implementation',
    async () => {
      return new InMemoryOutboxRepository();
    },
    // No cleanup needed for in-memory implementation
  );
});
