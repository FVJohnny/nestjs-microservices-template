import {
  testCriteriaConverterContract,
  type TestEntityDTO,
} from '@libs/nestjs-common/test-exports';
import { RedisCriteriaConverter } from './redis-criteria-converter';
import { RedisTestService } from '../testing/redis-test.service';

describe('RedisCriteriaConverter', () => {
  const redisTestService = new RedisTestService<TestEntityDTO>(5, 'test_entities');

  beforeAll(async () => {
    await redisTestService.setupDatabase();
  });

  beforeEach(async () => {
    // Completely flush the test database to ensure isolation
    await redisTestService.clear();
  });

  afterAll(async () => {
    await redisTestService.cleanupDatabase();
  });

  // Run the shared contract tests
  testCriteriaConverterContract('Redis Implementation', async (entities: TestEntityDTO[]) => {
    // Ensure complete data isolation for each test
    await redisTestService.clear();
    await redisTestService.setInitialData(entities);
    return new RedisCriteriaConverter<TestEntityDTO>(
      redisTestService.redisClient,
      redisTestService.keyPrefix,
    );
  });
});
