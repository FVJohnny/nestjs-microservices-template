import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventListener, TopicHandler, EventPayload } from '../interfaces/event-listener.interface';

/**
 * Redis implementation of EventListener
 * Uses Redis Pub/Sub to listen for events and adapts them to the generic EventPayload format
 */
@Injectable()
export class RedisEventListener implements EventListener, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisEventListener.name);
  private readonly topicHandlers = new Map<string, TopicHandler>();
  private isListeningFlag = false;
  private redisClient: any; // Would be Redis client instance

  constructor(/* Redis client would be injected here */) {
    // this.redisClient = redisClient;
  }

  async onModuleInit() {
    await this.startListening();
  }

  async onModuleDestroy() {
    await this.stopListening();
  }

  async startListening(): Promise<void> {
    if (this.isListeningFlag) {
      this.logger.warn('RedisEventListener is already listening');
      return;
    }

    // Subscribe to Redis channels for all registered topics
    for (const topicName of this.topicHandlers.keys()) {
      await this.subscribeToTopic(topicName);
    }

    this.isListeningFlag = true;
    this.logger.log('RedisEventListener started listening');
  }

  async stopListening(): Promise<void> {
    if (!this.isListeningFlag) {
      return;
    }

    // Unsubscribe from all Redis channels
    for (const topicName of this.topicHandlers.keys()) {
      await this.unsubscribeFromTopic(topicName);
    }

    this.isListeningFlag = false;
    this.logger.log('RedisEventListener stopped listening');
  }

  registerTopicHandler(handler: TopicHandler): void {
    this.topicHandlers.set(handler.topicName, handler);
    this.logger.log(`Registered topic handler for '${handler.topicName}'`);

    // If already listening, subscribe to the new topic
    if (this.isListeningFlag) {
      this.subscribeToTopic(handler.topicName);
    }
  }

  unregisterTopicHandler(topicName: string): void {
    this.topicHandlers.delete(topicName);
    this.logger.log(`Unregistered topic handler for '${topicName}'`);

    // If listening, unsubscribe from the topic
    if (this.isListeningFlag) {
      this.unsubscribeFromTopic(topicName);
    }
  }

  isListening(): boolean {
    return this.isListeningFlag;
  }

  private async subscribeToTopic(topicName: string): Promise<void> {
    // Example Redis subscription (pseudo-code)
    // this.redisClient.subscribe(topicName, (message) => {
    //   this.handleRedisMessage(topicName, message);
    // });
    this.logger.log(`Subscribed to Redis topic: ${topicName}`);
  }

  private async unsubscribeFromTopic(topicName: string): Promise<void> {
    // this.redisClient.unsubscribe(topicName);
    this.logger.log(`Unsubscribed from Redis topic: ${topicName}`);
  }

  private async handleRedisMessage(topicName: string, redisMessage: string): Promise<void> {
    try {
      const parsedMessage = JSON.parse(redisMessage) as Record<string, unknown>;
      const messageId = (parsedMessage.messageId as string) || `redis-${Date.now()}`;
      const eventName = parsedMessage.eventName as string;

      // Convert Redis message to generic EventPayload
      const eventPayload: EventPayload = {
        messageId,
        eventName,
        data: parsedMessage,
        timestamp: new Date(),
        source: 'redis',
      };

      // Find the appropriate topic handler
      const topicHandler = this.topicHandlers.get(topicName);

      if (!topicHandler) {
        this.logger.debug(`No handler registered for topic '${topicName}', skipping message [${messageId}]`);
        return;
      }

      // Delegate to the topic handler
      await topicHandler.handle(eventPayload);
    } catch (error) {
      this.logger.error(`Error handling Redis message: ${error}`);
      throw error;
    }
  }
}
