import { Injectable, Logger,OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private publisherClient: Redis | null = null;
  private subscriberClient: Redis | null = null;

  constructor() {}

  async onModuleInit(): Promise<void> {
    // Check if Redis should be disabled
    const disableRedis = process.env.DISABLE_REDIS === 'true' || process.env.DISABLE_ALL_DBS === 'true';
    const redisHost = process.env.REDIS_HOST;
    
    // Only initialize Redis if it's not disabled and host is configured
    if (disableRedis || !redisHost) {
      this.logger.warn('Redis is disabled or not configured. Event publishing/listening will not be available.');
      return;
    }
    
    const config = {
      host: redisHost,
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

    // Create main client for general operations
    this.client = new Redis(config);
    // Create dedicated publisher client
    this.publisherClient = new Redis(config);
    // Create dedicated subscriber client
    this.subscriberClient = new Redis(config);

    this.client.on('connect', () => {
      this.logger.log('✅ Connected to Redis (main client)');
    });

    this.client.on('error', (error) => {
      this.logger.error(`❌ Redis connection error (main): ${error.message}`);
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('🔄 Reconnecting to Redis (main)...');
    });

    // Wait for connection to be ready
    try {
      await this.client.ping();
      await this.publisherClient.ping();
      await this.subscriberClient.ping();
      this.logger.log('✅ All Redis clients connected successfully');
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Don't throw - allow the app to continue without Redis
      if (this.client) await this.client.quit();
      if (this.publisherClient) await this.publisherClient.quit();
      if (this.subscriberClient) await this.subscriberClient.quit();
      this.client = null;
      this.publisherClient = null;
      this.subscriberClient = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
    if (this.publisherClient) {
      await this.publisherClient.quit();
    }
    if (this.subscriberClient) {
      await this.subscriberClient.quit();
    }
    if (this.client || this.publisherClient || this.subscriberClient) {
      this.logger.log('👋 Disconnected from Redis');
    }
  }

  private checkRedisInitialized(): void {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  getPublisherClient(): Redis | null {
    return this.publisherClient;
  }

  getSubscriberClient(): Redis | null {
    return this.subscriberClient;
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

  /**
   * Scans Redis keys using the SCAN command (non-blocking alternative to KEYS)
   * @param pattern - The pattern to match keys against
   * @param count - Approximate number of keys to return per iteration (default: 100)
   * @returns Array of matching keys
   */
  async scan(pattern: string, count: number = 100): Promise<string[]> {
    this.checkRedisInitialized();
    
    const keys: string[] = [];
    let cursor = '0';
    
    do {
      const [nextCursor, batch] = await this.client!.scan(cursor, 'MATCH', pattern, 'COUNT', count);
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');
    
    return keys;
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