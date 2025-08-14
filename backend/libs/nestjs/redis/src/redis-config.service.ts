import { Injectable } from '@nestjs/common';
import { RedisConfig } from './interfaces/redis-config.interface';

@Injectable()
export class RedisConfigService {
  private config: RedisConfig | null = null;

  setConfig(config: RedisConfig): void {
    this.config = config;
  }

  getRedisConfig(): RedisConfig {
    if (this.config) {
      return this.config;
    }

    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'app:',
      connectTimeout: 10000,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    };
  }

  getConnectionUrl(): string {
    const config = this.getRedisConfig();
    const auth = config.password ? `:${config.password}@` : '';
    return `redis://${auth}${config.host}:${config.port}/${config.db}`;
  }
}