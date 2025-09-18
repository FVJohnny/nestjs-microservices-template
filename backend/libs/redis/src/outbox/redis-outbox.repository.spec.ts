import { RedisOutboxRepository } from './redis-outbox.repository';
import { testOutboxRepositoryContract } from '@libs/nestjs-common';
import { RedisTestService } from '../testing/redis-test.service';

describe('RedisOutboxRepository', () => {
  const redisTestService = new RedisTestService(1); // Use database 1 for tests

  // Run the shared contract tests
  testOutboxRepositoryContract(
    'Redis Implementation',
    async () => new RedisOutboxRepository(redisTestService.redisClient),
    {
      beforeAll: () => redisTestService.clearOutboxKeys(),
      afterAll: () => redisTestService.clearOutboxKeys(),
      beforeEach: () => redisTestService.clearOutboxKeys(),
    },
  );
});
