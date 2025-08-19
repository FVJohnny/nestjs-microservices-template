import { Injectable, Inject } from '@nestjs/common';
import { BaseIntegrationEventListener } from '@libs/nestjs-common';
import { RedisService } from './redis.service';

/**
 * Redis implementation of EventListener
 * Provides event listening through Redis pub/sub
 */
@Injectable()
export class RedisIntegrationEventListener extends BaseIntegrationEventListener {
  constructor(
    private readonly redisService: RedisService,
  ) {
    super();
  }

  async onModuleInit() {
    await super.onModuleInit();
    // Auto-start listening when the module initializes
    // This ensures handlers registered in onModuleInit are ready
    setTimeout(async () => {
      if (this.eventHandlers.size > 0 && !this.isListeningFlag) {
        this.logger.log(`Auto-starting listener with ${this.eventHandlers.size} registered handlers`);
        await this.startListening();
      }
    }, 100); // Small delay to allow all handlers to register
  }

  protected async subscribeToTopic(topicName: string): Promise<void> {
    const client = this.redisService.getSubscriberClient();
    if (!client) {
      this.logger.warn(`No Redis subscriber client available, cannot subscribe to ${topicName}`);
      return;
    }

    try {
      // Subscribe to the Redis channel
      await client.subscribe(topicName);
      
      // Set up message handler (only once, not for each topic)
      if (!client.listenerCount('message')) {
        client.on('message', async (channel: string, message: string) => {
          await this.handleMessage(channel, message);
        });
      }
      
      this.logger.log(`Subscribed to Redis channel: ${topicName}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to Redis channel ${topicName}:`, error);
      throw error;
    }
  }

  protected async unsubscribeFromTopic(topicName: string): Promise<void> {
    const client = this.redisService.getSubscriberClient();
    if (!client) {
      this.logger.warn(`No Redis subscriber client available, cannot unsubscribe from ${topicName}`);
      return;
    }

    try {
      await client.unsubscribe(topicName);
      this.logger.log(`Unsubscribed from Redis channel: ${topicName}`);
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from Redis channel ${topicName}:`, error);
    }
  }

  protected parseMessage(rawMessage: any): { parsedMessage: Record<string, unknown>; messageId: string } {
    try {
      const parsedMessage = typeof rawMessage === 'string' 
        ? JSON.parse(rawMessage) as Record<string, unknown>
        : rawMessage as Record<string, unknown>;
      
      const messageId = (parsedMessage.messageId as string) || 
                       (parsedMessage.eventId as string) || 
                       `redis-${Date.now()}`;
      
      return { parsedMessage, messageId };
    } catch (error) {
      this.logger.error(`Error parsing Redis message: ${error}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    await super.onModuleDestroy();
  }
}