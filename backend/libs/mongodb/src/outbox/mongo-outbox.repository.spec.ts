import { MongoOutboxRepository } from './mongo-outbox.repository';
import { testOutboxRepositoryContract } from '@libs/nestjs-common/test-exports';
import { MongodbTestService } from '../testing/mongodb-test.service';
import type { OutboxEventDTO } from '@libs/nestjs-common';

describe('MongoOutboxRepository', () => {
  const mongoTestService = new MongodbTestService<OutboxEventDTO>(
    MongoOutboxRepository.CollectionName,
  );

  // Run the shared contract tests
  testOutboxRepositoryContract(
    'MongoDB Implementation',
    async () => new MongoOutboxRepository(mongoTestService.mongoClient),
    {
      beforeAll: () => mongoTestService.setupDatabase(),
      beforeEach: () => mongoTestService.clearCollection(),
      afterAll: () => mongoTestService.cleanup(),
    },
  );
});
