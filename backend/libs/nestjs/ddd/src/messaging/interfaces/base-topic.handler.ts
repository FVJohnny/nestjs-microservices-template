import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventHandler, EventPayload, TopicHandler } from './event-listener.interface';

/**
 * Base topic handler that works with any event source (Kafka, Redis, etc.)
 * Manages event handler registration, message routing, error handling, and logging
 */
@Injectable()
export abstract class BaseTopicHandler implements TopicHandler, OnModuleInit {
  protected readonly logger = new Logger(this.constructor.name);
  private readonly eventHandlers = new Map<string, EventHandler>();

  abstract readonly topicName: string;

  async onModuleInit() {
    this.logger.log(`${this.constructor.name} initialized for topic '${this.topicName}'`);
  }

  /**
   * Register an event handler for a specific event type
   */
  protected registerEventHandler(handler: EventHandler): void {
    this.eventHandlers.set(handler.eventName, handler);
    this.logger.log(`Registered event handler for '${handler.eventName}' in topic '${this.topicName}'`);
  }

  /**
   * Handle incoming event payload by routing to appropriate event handler
   */
  async handle(eventPayload: EventPayload): Promise<void> {
    const { messageId, eventName, data } = eventPayload;

    this.logger.debug(`Processing event '${eventName}' [${messageId}] in topic '${this.topicName}'`);

    try {
      const handler = this.eventHandlers.get(eventName);

      if (!handler) {
        this.logger.debug(
          `No handler registered for event '${eventName}' in topic '${this.topicName}', skipping message [${messageId}]`,
        );
        return;
      }

      await handler.handle(data, messageId);

      this.logger.debug(`✅ Successfully processed event '${eventName}' [${messageId}]`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to process event '${eventName}' [${messageId}] in topic '${this.topicName}': ${error}`,
      );

      // Determine if error is retriable
      if (this.isRetriableError(error)) {
        this.logger.warn(`Retriable error for event '${eventName}' [${messageId}], will retry`);
        throw error; // Re-throw to trigger retry mechanism
      } else {
        this.logger.error(`Non-retriable error for event '${eventName}' [${messageId}], skipping`);
        // Don't re-throw, message will be acknowledged and skipped
      }
    }
  }

  /**
   * Determine if an error should trigger a retry
   * Override this method to customize retry logic
   */
  protected isRetriableError(error: any): boolean {
    // Default: treat all errors as retriable except validation errors
    if (error.name === 'ValidationError' || error.message?.includes('validation')) {
      return false;
    }

    // Network errors, timeouts, etc. are typically retriable
    return true;
  }

  /**
   * Get all registered event handlers
   */
  protected getRegisteredEventHandlers(): Map<string, EventHandler> {
    return new Map(this.eventHandlers);
  }

  /**
   * Get handler for specific event name
   */
  protected getEventHandler(eventName: string): EventHandler | undefined {
    return this.eventHandlers.get(eventName);
  }

  /**
   * Check if handler is registered for event
   */
  protected hasEventHandler(eventName: string): boolean {
    return this.eventHandlers.has(eventName);
  }

  /**
   * Get count of registered handlers
   */
  protected getHandlerCount(): number {
    return this.eventHandlers.size;
  }

  /**
   * Get all registered event names
   */
  protected getRegisteredEventNames(): string[] {
    return Array.from(this.eventHandlers.keys());
  }
}
