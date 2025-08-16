import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventListener, EventHandler } from '../interfaces/event-listener.interface';

/**
 * Abstract base class for EventListener implementations
 * Provides common functionality for managing event handlers and listening state
 */
@Injectable()
export abstract class BaseEventListener implements EventListener, OnModuleInit, OnModuleDestroy {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly eventHandlers = new Map<string, EventHandler>();
  protected readonly messageStats = new Map<string, {
    messagesProcessed: number;
    messagesSucceeded: number;
    messagesFailed: number;
    totalProcessingTime: number;
    lastProcessedAt: Date | null;
  }>();
  protected isListeningFlag = false;

  async onModuleInit() {
    // Subclasses can override this for initialization
  }

  async onModuleDestroy() {
    if (this.isListeningFlag) {
      await this.stopListening();
    }
  }

  async startListening(): Promise<void> {
    if (this.isListeningFlag) {
      this.logger.warn(`${this.constructor.name} is already listening`);
      return;
    }

    this.isListeningFlag = true;

    // Subscribe to all registered topics
    for (const topicName of this.eventHandlers.keys()) {
      await this.subscribeToTopic(topicName);
    }

    this.logger.log(`${this.constructor.name} started listening`);
  }

  async stopListening(): Promise<void> {
    if (!this.isListeningFlag) {
      this.logger.warn(`${this.constructor.name} is not currently listening`);
      return;
    }

    this.isListeningFlag = false;

    // Unsubscribe from all topics
    for (const topicName of this.eventHandlers.keys()) {
      await this.unsubscribeFromTopic(topicName);
    }

    this.logger.log(`${this.constructor.name} stopped listening`);
  }

  isListening(): boolean {
    return this.isListeningFlag;
  }

  async registerEventHandler(topicName: string, handler: EventHandler): Promise<void> {
    const currentHandler = this.eventHandlers.get(topicName);
    if (currentHandler) {
      this.logger.warn(
        `Tried to register handler '${handler.constructor.name}' for topic '${topicName}' ` +
        `but it already exists on handler '${currentHandler.constructor.name}'`
      );
      return;
    }

    this.eventHandlers.set(topicName, handler);

    // Initialize message stats for this topic
    this.messageStats.set(topicName, {
      messagesProcessed: 0,
      messagesSucceeded: 0,
      messagesFailed: 0,
      totalProcessingTime: 0,
      lastProcessedAt: null,
    });

    // Always subscribe to the topic when registering a handler
    await this.subscribeToTopic(topicName);

    this.logger.log(`Registered event handler '${handler.constructor.name}' for topic '${topicName}'`);
  }

  /**
   * Handle incoming messages from the event source
   * Parses the message and delegates to the appropriate event handler
   */
  protected async handleMessage(topicName: string, rawMessage: any): Promise<void> {
    const startTime = Date.now();
    const stats = this.messageStats.get(topicName);
    
    try {
      const { parsedMessage, messageId } = this.parseMessage(rawMessage);

      // Find the appropriate event handler
      const eventHandler = this.eventHandlers.get(topicName);

      if (!eventHandler) {
        this.logger.debug(`No handler registered for topic '${topicName}', skipping message [${messageId}]`);
        return;
      }

      // Update message stats - increment processed count
      if (stats) {
        stats.messagesProcessed++;
        stats.lastProcessedAt = new Date();
      }

      // Delegate to the event handler
      await eventHandler.handle(parsedMessage, messageId);
      
      // Update success stats
      if (stats) {
        stats.messagesSucceeded++;
        stats.totalProcessingTime += Date.now() - startTime;
      }
      
    } catch (error) {
      // Update failure stats
      if (stats) {
        stats.messagesFailed++;
        stats.totalProcessingTime += Date.now() - startTime;
      }
      
      this.logger.error(`Error handling message for topic '${topicName}': ${error}`);
      throw error;
    }
  }

  /**
   * Get message statistics for all topics
   */
  getMessageStats() {
    const stats = [];
    for (const [topicName, handler] of this.eventHandlers.entries()) {
      const messageStats = this.messageStats.get(topicName);
      if (messageStats) {
        stats.push({
          topic: topicName,
          handlerName: handler.constructor.name,
          messagesProcessed: messageStats.messagesProcessed,
          messagesSucceeded: messageStats.messagesSucceeded,
          messagesFailed: messageStats.messagesFailed,
          averageProcessingTime: messageStats.messagesProcessed > 0 
            ? Math.round(messageStats.totalProcessingTime / messageStats.messagesProcessed)
            : 0,
          lastProcessedAt: messageStats.lastProcessedAt,
        });
      }
    }
    return stats;
  }

  /**
   * Get total message statistics across all topics
   */
  getTotalMessageStats() {
    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;
    let totalProcessingTime = 0;

    for (const stats of this.messageStats.values()) {
      totalProcessed += stats.messagesProcessed;
      totalSucceeded += stats.messagesSucceeded;
      totalFailed += stats.messagesFailed;
      totalProcessingTime += stats.totalProcessingTime;
    }

    return {
      totalMessages: totalProcessed,
      totalSuccesses: totalSucceeded,
      totalFailures: totalFailed,
      averageProcessingTime: totalProcessed > 0 
        ? Math.round(totalProcessingTime / totalProcessed)
        : 0,
    };
  }

  /**
   * Abstract methods that subclasses must implement
   */
  protected abstract subscribeToTopic(topicName: string): Promise<void>;
  protected abstract unsubscribeFromTopic(topicName: string): Promise<void>;
  protected abstract parseMessage(rawMessage: any): { parsedMessage: Record<string, unknown>; messageId: string };
}
