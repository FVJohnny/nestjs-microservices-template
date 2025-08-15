import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor() {}

  async onModuleInit(): Promise<void> {
    
    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      keyPrefix: process.env.REDIS_KEY_PREFIX || '',
      connectTimeout: 10000,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    };

    this.logger.log(`Connecting to Redis at ${config.host}:${config.port}`);

    this.client = new Redis(config);

    this.client.on('connect', () => {
      this.logger.log('✅ Connected to Redis');
    });

    this.client.on('error', (error) => {
      this.logger.error(`❌ Redis connection error: ${error.message}`);
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('🔄 Reconnecting to Redis...');
    });

    // Wait for connection to be ready
    try {
      await this.client.ping();
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('👋 Disconnected from Redis');
    }
  }

  private checkRedisInitialized(): void {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
  }

  getClient(): Redis {
    this.checkRedisInitialized();
    return this.client!;
  }

  // Convenience methods for common operations
  async get(key: string): Promise<string | null> {
    this.checkRedisInitialized();
    return this.client!.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    this.checkRedisInitialized();
    if (ttl) {
      return this.client!.setex(key, ttl, value);
    }
    return this.client!.set(key, value);
  }

  async del(key: string): Promise<number> {
    this.checkRedisInitialized();
    return this.client!.del(key);
  }

  async exists(key: string): Promise<number> {
    this.checkRedisInitialized();
    return this.client!.exists(key);
  }

  async keys(pattern: string): Promise<string[]> {
    this.checkRedisInitialized();
    return this.client!.keys(pattern);
  }

  async hget(key: string, field: string): Promise<string | null> {
    this.checkRedisInitialized();
    return this.client!.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    this.checkRedisInitialized();
    return this.client!.hset(key, field, value);
  }

  async hmset(key: string, hash: Record<string, string>): Promise<'OK'> {
    this.checkRedisInitialized();
    return this.client!.hmset(key, hash);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    this.checkRedisInitialized();
    return this.client!.hgetall(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    this.checkRedisInitialized();
    return this.client!.hdel(key, ...fields);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    this.checkRedisInitialized();
    return this.client!.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    this.checkRedisInitialized();
    return this.client!.srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    this.checkRedisInitialized();
    return this.client!.smembers(key);
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    this.checkRedisInitialized();
    return this.client!.mget(...keys);
  }
}