import { Injectable, Inject } from '@nestjs/common';
import { BaseEventListener } from '@libs/nestjs-common';
import { RedisService } from './redis.service';

/**
 * Redis implementation of EventListener
 * Provides event listening through Redis pub/sub
 */
@Injectable()
export class RedisEventListener extends BaseEventListener {
  private subscriberClient: any;

  constructor(
    private readonly redisService: RedisService,
  ) {
    super();
    // Create a dedicated client for subscriptions
    const mainClient = this.redisService.getClient();
    if (mainClient) {
      this.subscriberClient = mainClient.duplicate();
    }
  }

  protected async subscribeToTopic(topicName: string): Promise<void> {
    if (!this.subscriberClient) {
      this.logger.warn(`No Redis client available, cannot subscribe to ${topicName}`);
      return;
    }

    try {
      // Subscribe to the Redis channel
      await this.subscriberClient.subscribe(topicName);
      
      // Set up message handler
      this.subscriberClient.on('message', async (channel: string, message: string) => {
        if (channel === topicName) {
          await this.handleMessage(topicName, message);
        }
      });
      
      this.logger.log(`Subscribed to Redis channel: ${topicName}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to Redis channel ${topicName}:`, error);
      throw error;
    }
  }

  protected async unsubscribeFromTopic(topicName: string): Promise<void> {
    if (!this.subscriberClient) {
      return;
    }

    try {
      await this.subscriberClient.unsubscribe(topicName);
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
    // Clean up subscriber client on module destroy
    if (this.subscriberClient) {
      await this.subscriberClient.quit();
    }
    await super.onModuleDestroy();
  }
}