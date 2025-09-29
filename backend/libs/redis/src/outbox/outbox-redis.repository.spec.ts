import { Outbox_Redis_Repository } from './outbox-redis.repository';
import { testOutboxRepositoryContract } from '@libs/nestjs-common/test-exports';
import { RedisTestService } from '../testing/redis-test.service';

describe('Outbox_Redis_Repository', () => {
  const redisTestService = new RedisTestService(1); // Use database 1 for tests

  // Run the shared contract tests
  testOutboxRepositoryContract(
    'Redis Implementation',
    async () => new Outbox_Redis_Repository(redisTestService.redisClient),
    {
      beforeAll: () => redisTestService.clear(),
      afterAll: () => redisTestService.clear(),
      beforeEach: () => redisTestService.clear(),
    },
  );
});
