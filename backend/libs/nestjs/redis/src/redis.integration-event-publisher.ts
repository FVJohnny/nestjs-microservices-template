import { Injectable, Logger, Inject } from '@nestjs/common';
import { IntegrationEventPublisher } from '@libs/nestjs-common';
import { RedisService } from './redis.service';

/**
 * Redis implementation of EventPublisher interface.
 * Provides type-safe event publishing through Redis pub/sub.
 */
@Injectable()
export class RedisIntegrationEventPublisher implements IntegrationEventPublisher {
  private readonly logger = new Logger(RedisIntegrationEventPublisher.name);

  constructor(
    private readonly redisService: RedisService,
  ) {}

  async publish(topic: string, message: any): Promise<void> {
    this.logger.debug(`[Redis] Publishing event to channel: ${topic}`);
    
    try {
      const messageStr = JSON.stringify(message);
      const client = this.redisService.getPublisherClient();
      
      if (client) {
        await client.publish(topic, messageStr);
        this.logger.debug(`[Redis] Event published to ${topic}: ${message.eventName || 'unknown'}`);
      } else {
        // Fallback for when Redis is not configured
        this.logger.warn(`[Redis] No Redis publisher client available, event not published to ${topic}`);
      }
    } catch (error) {
      this.logger.error(`[Redis] Failed to publish event to channel ${topic}:`, error);
      throw error;
    }
  }

  async publishBatch(topic: string, messages: any[]): Promise<void> {
    this.logger.debug(`[Redis] Publishing ${messages.length} events to channel: ${topic}`);
    
    try {
      const client = this.redisService.getPublisherClient();
      
      if (client) {
        // Use pipelining for better performance with batch operations
        const pipeline = client.pipeline();
        
        for (const message of messages) {
          pipeline.publish(topic, JSON.stringify(message));
        }
        
        await pipeline.exec();
        this.logger.debug(`[Redis] ${messages.length} events published to ${topic}`);
      } else {
        this.logger.warn(`[Redis] No Redis publisher client available, batch not published to ${topic}`);
      }
    } catch (error) {
      this.logger.error(`[Redis] Failed to publish batch events to channel ${topic}:`, error);
      throw error;
    }
  }
}