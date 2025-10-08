import { Outbox_Mongodb_Repository } from './outbox.mongodb-repository';
import { testOutboxRepositoryContract } from '@libs/nestjs-common/test-exports';
import { MongodbTestService } from '../testing/mongodb-test.service';
import type { OutboxEventDTO } from '@libs/nestjs-common';

describe('Outbox_Mongodb_Repository', () => {
  const mongoTestService = new MongodbTestService<OutboxEventDTO>(
    Outbox_Mongodb_Repository.CollectionName,
  );

  // Run the shared contract tests
  testOutboxRepositoryContract(
    'MongoDB Implementation',
    async () => new Outbox_Mongodb_Repository(mongoTestService.mongoClient),
    {
      beforeAll: () => mongoTestService.setupDatabase(),
      beforeEach: () => mongoTestService.clearCollection(),
      afterAll: () => mongoTestService.cleanup(),
    },
  );
});
