import { CorrelationLogger } from '@libs/nestjs-common';
import { Redis } from 'ioredis';
import type { SharedAggregateRootDTO } from '@libs/nestjs-common';

export class RedisTestService<T extends SharedAggregateRootDTO> {
  readonly redisClient: Redis;
  private readonly logger = new CorrelationLogger(RedisTestService.name);

  constructor(
    private readonly dbIndex: number = 0,
    public readonly keyPrefix: string = 'test',
  ) {
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

  async clear() {
    await this.redisClient.flushdb();
  }

  async setInitialData(data: T[]) {
    await this.clear();
    if (data.length === 0) return;

    const pipeline = this.redisClient.pipeline();

    for (const item of data) {
      const key = `${this.keyPrefix}:${item.id}`;
      const hashData: Record<string, string> = {};

      // Convert entity to Redis hash format
      for (const [field, value] of Object.entries(item)) {
        if (value === undefined || value === null) {
          continue;
        }

        // Store complex objects as JSON strings
        if (typeof value === 'object') {
          hashData[field] = JSON.stringify(value);
        } else {
          hashData[field] = String(value);
        }
      }

      pipeline.hset(key, hashData);
    }

    await pipeline.exec();
  }
}
