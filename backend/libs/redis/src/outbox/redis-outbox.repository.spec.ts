import { RedisOutboxRepository } from './redis-outbox.repository';
import { testOutboxRepositoryContract } from '@libs/nestjs-common/test-exports';
import { RedisService } from '../redis.service';

describe('RedisOutboxRepository', () => {
  let redisService: RedisService;

  const cleanupKeys = async () => {
    const client = redisService.getDatabaseClient();
    if (!client) return;
    const keys = await client.keys('outbox:*');
    if (keys.length) await client.del(keys);
  };

  beforeAll(async () => {
    // Provide sensible defaults if not set
    process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
    process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
    process.env.REDIS_DB = process.env.REDIS_DB || '0';

    redisService = new RedisService();
    await redisService.onModuleInit();

    const client = redisService.getDatabaseClient();
    if (!client) {
      throw new Error(
        'Redis not available for tests. Set REDIS_HOST/PORT and ensure Redis is running.',
      );
    }

    await cleanupKeys();
  });

  afterAll(async () => {
    await redisService.onModuleDestroy();
  });

  // Run the shared contract tests
  testOutboxRepositoryContract(
    'Redis Implementation',
    async () => {
      await cleanupKeys(); // Clean before each test
      return new RedisOutboxRepository(redisService);
    },
    cleanupKeys, // Clean after each test
  );
});
