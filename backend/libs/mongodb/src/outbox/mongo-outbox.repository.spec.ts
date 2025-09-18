import { MongoOutboxRepository } from './mongo-outbox.repository';
import { testOutboxRepositoryContract } from '@libs/nestjs-common';
import { MongodbTestService } from '../testing/mongodb-test.service';

describe('MongoOutboxRepository', () => {
  const mongoTestService = new MongodbTestService('outbox_test_db');

  // Run the shared contract tests
  testOutboxRepositoryContract(
    'MongoDB Implementation',
    async () => new MongoOutboxRepository(mongoTestService.mongoClient),
    {
      beforeAll: () => mongoTestService.setupDatabase(),
      afterAll: () => mongoTestService.cleanupDatabase(),
      beforeEach: () => mongoTestService.clearCollection('outbox_events'),
    },
  );
});
