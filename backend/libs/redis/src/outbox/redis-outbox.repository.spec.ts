import { RedisOutboxRepository } from './redis-outbox.repository';
import { testOutboxRepositoryContract } from '@libs/nestjs-common/test-exports';
import { RedisTestService } from '../testing/redis-test.service';

describe('RedisOutboxRepository', () => {
  const redisTestService = new RedisTestService(1); // Use database 1 for tests

  // Run the shared contract tests
  testOutboxRepositoryContract(
    'Redis Implementation',
    async () => new RedisOutboxRepository(redisTestService.redisClient),
    {
      beforeAll: () => redisTestService.clear(),
      afterAll: () => redisTestService.clear(),
      beforeEach: () => redisTestService.clear(),
    },
  );
});
