import { IntegrationEventPublisher } from '@libs/nestjs-common';
import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from './redis.service';

@Injectable()
export class RedisIntegrationEventPublisher implements IntegrationEventPublisher {
  private readonly logger = new Logger(RedisIntegrationEventPublisher.name);

  constructor(private readonly redisService: RedisService) {}

  async publish(topic: string, message: string): Promise<void> {
    const client = this.redisService.getPublisherClient();
    if (!client) {
      this.logger.warn(
        `[Redis] No Redis publisher client available, event not published to ${topic}`,
      );
      return;
    }

    try {
      this.logger.debug(`[Redis] Publishing event to channel: ${topic}. Message: ${message}`);
      await client.publish(topic, message);
      this.logger.debug(`[Redis] Event published to ${topic}. Message: ${message}`);
    } catch (error) {
      this.logger.error(`[Redis] Failed to publish event to channel ${topic}:`, error);
      throw error;
    }
  }
}
