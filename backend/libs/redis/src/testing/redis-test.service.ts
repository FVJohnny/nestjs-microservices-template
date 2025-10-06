import type { SharedAggregateRootDTO } from '@libs/nestjs-common';
import { RedisService } from '../redis.service';

export class RedisTestService<T extends SharedAggregateRootDTO> extends RedisService {
  private static dbCounter = 0;

  constructor(private readonly keyPrefix: string = 'test') {
    super();
  }

  async setupDatabase() {
    if (!process.env.REDIS_HOST) {
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
    }
    // Use instance-specific database number
    process.env.REDIS_DB = String((Date.now() % 100) * 100 + (RedisTestService.dbCounter++ % 100));

    await this.onModuleInit();
  }

  async closeDatabase() {
    await this.clear();
    await this.onModuleDestroy();
  }

  async clear() {
    await this.getDatabaseClient()?.flushdb();
  }

  async setInitialData(data: T[]) {
    await this.clear();
    if (data.length === 0) return;

    const pipeline = this.getDatabaseClient()?.pipeline();

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

      pipeline?.hset(key, hashData);
    }

    await pipeline?.exec();
  }
}
