import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CorrelationLogger } from '@libs/nestjs-common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new CorrelationLogger(RedisService.name);
  private databaseClient: Redis | null = null;
  private publisherClient: Redis | null = null;
  private subscriberClient: Redis | null = null;

  constructor() {}

  async onModuleInit(): Promise<void> {
    // Skip Redis initialization in test environment
    if (process.env.NODE_ENV === 'test') {
      this.logger.log('Skipping Redis initialization in test environment');
      return;
    }

    // Check if Redis should be disabled
    const redisHost = process.env.REDIS_HOST;

    // Only initialize Redis if it's not disabled and host is configured
    if (!redisHost) {
      this.logger.warn(
        'Redis is not configured. Event publishing/listening and storage on Redis will not be available.',
      );
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
    this.databaseClient = new Redis(config);
    // Create dedicated publisher client
    this.publisherClient = new Redis(config);
    // Create dedicated subscriber client
    this.subscriberClient = new Redis(config);

    [
      { client: this.databaseClient, name: 'main' },
      { client: this.publisherClient, name: 'publisher' },
      { client: this.subscriberClient, name: 'subscriber' },
    ].forEach(({ client, name }) => {
      client.on('connect', () => {
        this.logger.log(`✅ Connected to Redis ${name}`);
      });
      client.on('error', (error) => {
        this.logger.error(`❌ Redis connection error: ${error.message}`);
      });
      client.on('reconnecting', () => {
        this.logger.warn(`🔄 Reconnecting to Redis ${name}...`);
      });
    });

    // Wait for connection to be ready
    try {
      await Promise.all([
        this.databaseClient.ping(),
        this.publisherClient.ping(),
        this.subscriberClient.ping(),
      ]);
      this.logger.log('✅ All Redis clients connected successfully');
    } catch (error) {
      this.logger.error(
        `Failed to connect to Redis: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't throw - allow the app to continue without Redis
      if (this.databaseClient) await this.databaseClient.quit();
      if (this.publisherClient) await this.publisherClient.quit();
      if (this.subscriberClient) await this.subscriberClient.quit();
      this.databaseClient = null;
      this.publisherClient = null;
      this.subscriberClient = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.databaseClient) {
      await this.databaseClient.quit();
    }
    if (this.publisherClient) {
      await this.publisherClient.quit();
    }
    if (this.subscriberClient) {
      await this.subscriberClient.quit();
    }
    this.logger.log('👋 Disconnected from Redis');
  }

  getDatabaseClient(): Redis | null {
    return this.databaseClient;
  }

  getPublisherClient(): Redis | null {
    return this.publisherClient;
  }

  getSubscriberClient(): Redis | null {
    return this.subscriberClient;
  }
}
