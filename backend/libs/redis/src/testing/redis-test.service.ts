import { CorrelationLogger } from '@libs/nestjs-common';
import { Redis } from 'ioredis';

export class RedisTestService {
  readonly redisClient: Redis;
  private readonly logger = new CorrelationLogger(RedisTestService.name);

  constructor(private readonly dbIndex: number = 0) {
    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      db: dbIndex,
      connectTimeout: 10000,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    };

    this.redisClient = new Redis(config);
  }

  async setupDatabase() {
    try {
      this.logger.debug('Connecting to existing Redis instance...');

      await this.redisClient.connect();
      await this.redisClient.ping();

      // Clear the test database
      await this.redisClient.flushdb();

      this.logger.debug('Test setup completed');
    } catch (error) {
      this.logger.error('Error in database setup:', error);
      throw error;
    }
  }

  async cleanupDatabase() {
    try {
      await this.redisClient.flushdb();
      this.logger.debug('Cleaned up test database');
    } catch (error) {
      this.logger.error('Error cleaning up test database:', error);
    }
    await this.redisClient.quit();
  }

  async clearKeys(pattern: string = '*') {
    const keys = await this.redisClient.keys(pattern);
    if (keys.length > 0) {
      await this.redisClient.del(keys);
    }
  }

  async clearOutboxKeys() {
    await this.clearKeys('outbox:*');
  }
}
