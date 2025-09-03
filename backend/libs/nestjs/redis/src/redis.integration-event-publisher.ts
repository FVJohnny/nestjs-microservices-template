import { IntegrationEventPublisher } from '@libs/nestjs-common';
import {Injectable, Logger } from '@nestjs/common';

import { RedisService } from './redis.service';

@Injectable()
export class RedisIntegrationEventPublisher implements IntegrationEventPublisher {
  private readonly logger = new Logger(RedisIntegrationEventPublisher.name);

  constructor(
    private readonly redisService: RedisService,
  ) {}

  async publish(topic: string, message: Record<string, unknown>): Promise<void> {
    this.logger.debug(`[Redis] Publishing event to channel: ${topic}`);
    const client = this.redisService.getPublisherClient();
    if (!client) {
      this.logger.warn(`[Redis] No Redis publisher client available, event not published to ${topic}`);
      return;
    }
    
    try {
      const messageStr = JSON.stringify(message);
      await client.publish(topic, messageStr);
      this.logger.debug(`[Redis] Event published to ${topic}: ${message.name || 'unknown'}`);
    } catch (error) {
      this.logger.error(`[Redis] Failed to publish event to channel ${topic}:`, error);
      throw error;
    }
  }
}