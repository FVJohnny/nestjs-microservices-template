import type { SharedAggregateRootDTO } from '@libs/nestjs-common';
import { RedisService } from '../redis.service';

export class RedisTestService<T extends SharedAggregateRootDTO> extends RedisService {
  private static dbCounter = 0;
  private readonly dbNumber: number;
  private readonly uniqueKeyPrefix: string;

  constructor(keyPrefix: string = 'test') {
    super();
    // Assign unique database number for each test instance to avoid conflicts
    // Redis supports databases 0-15 by default
    this.dbNumber = RedisTestService.dbCounter++ % 16;
    // Add timestamp and random value to keyPrefix for additional isolation
    this.uniqueKeyPrefix = `${keyPrefix}:${Date.now()}:${Math.random().toString(36).substring(2, 11)}`;
  }

  getKeyPrefix(): string {
    return this.uniqueKeyPrefix;
  }

  async setupDatabase() {
    if (!process.env.REDIS_HOST) {
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
    }
    // Use instance-specific database number to isolate tests
    process.env.REDIS_DB = String(this.dbNumber);

    await this.onModuleInit();

    // Clear the database immediately after connecting to ensure clean state
    await this.clear();
  }

  async closeDatabase() {
    // Clear before closing to prevent stale data
    await this.clear();
    await this.onModuleDestroy();
  }

  async clear() {
    const client = this.getDatabaseClient();
    if (client) {
      await client.flushdb();
    }
  }

  async setInitialData(data: T[]) {
    await this.clear();
    if (data.length === 0) return;

    const pipeline = this.getDatabaseClient()?.pipeline();

    for (const item of data) {
      const key = `${this.uniqueKeyPrefix}:${item.id}`;
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
