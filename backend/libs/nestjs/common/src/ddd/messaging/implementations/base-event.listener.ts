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

    // Always subscribe to the topic when registering a handler
    await this.subscribeToTopic(topicName);

    this.logger.log(`Registered event handler '${handler.constructor.name}' for topic '${topicName}'`);
  }

  /**
   * Handle incoming messages from the event source
   * Parses the message and delegates to the appropriate event handler
   */
  protected async handleMessage(topicName: string, rawMessage: any): Promise<void> {
    try {
      const { parsedMessage, messageId } = this.parseMessage(rawMessage);

      // Find the appropriate event handler
      const eventHandler = this.eventHandlers.get(topicName);

      if (!eventHandler) {
        this.logger.debug(`No handler registered for topic '${topicName}', skipping message [${messageId}]`);
        return;
      }

      // Delegate to the event handler
      await eventHandler.handle(parsedMessage, messageId);
    } catch (error) {
      this.logger.error(`Error handling message for topic '${topicName}': ${error}`);
      throw error;
    }
  }

  /**
   * Abstract methods that subclasses must implement
   */
  protected abstract subscribeToTopic(topicName: string): Promise<void>;
  protected abstract unsubscribeFromTopic(topicName: string): Promise<void>;
  protected abstract parseMessage(rawMessage: any): { parsedMessage: Record<string, unknown>; messageId: string };
}
