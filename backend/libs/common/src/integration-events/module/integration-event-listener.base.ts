import { Injectable, Logger } from '@nestjs/common';

import type { ParsedIntegrationMessage } from '../types/integration-event.types';
import { IIntegrationEventHandler } from './integration-event-handler.base';

interface HandlerInfo {
  handler: IIntegrationEventHandler;
  eventName: string;
  handlerName: string;
}

export const INTEGRATION_EVENT_LISTENER_TOKEN = 'IntegrationEventListener';
export interface IntegrationEventListener {
  registerEventHandler(topicName: string, handler: IIntegrationEventHandler): Promise<void>;
}

/**
 * Abstract base class for EventListener implementations
 * Provides common functionality for managing event handlers and listening state
 */
@Injectable()
export abstract class BaseIntegrationEventListener implements IntegrationEventListener {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly eventHandlers = new Map<string, HandlerInfo[]>(); // topic -> array of handlers

  async registerEventHandler(topicName: string, handler: IIntegrationEventHandler): Promise<void> {
    // Extract event type from handler's event class
    let eventName = 'Unknown';
    try {
      const eventClass = (handler as IIntegrationEventHandler & { eventClass?: new(...args: unknown[]) => { name: string } }).eventClass;
      if (eventClass) {
        try {
          let tempInstance;
          try {
            tempInstance = new eventClass({});
          } catch {
            tempInstance = new eventClass({}, new Date());
          }
          eventName = tempInstance.name;
        } catch {
          this.logger.warn(`Could not extract event type for handler ${handler.constructor.name}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to extract event type: ${error}`);
    }

    // Get existing handlers for this topic or create new array
    let topicHandlers = this.eventHandlers.get(topicName);
    if (!topicHandlers) {
      topicHandlers = [];
      this.eventHandlers.set(topicName, topicHandlers);
    }

    // Check if handler for this specific event type already exists
    const existingHandler = topicHandlers.find(info => info.eventName === eventName);
    if (existingHandler) {
      this.logger.warn(
        `Tried to register handler '${handler.constructor.name}' for topic '${topicName}' and event type '${eventName}' ` +
        `but it already exists on handler '${existingHandler.handlerName}'`
      );
      return;
    }

    // Add handler to the topic's handler list
    topicHandlers.push({
      handler,
      eventName: eventName,
      handlerName: handler.constructor.name
    });

    // Subscribe to topic if this is the first handler for this topic
    if (topicHandlers.length === 1) {
      await this.subscribeToTopic(topicName);
    }
    
    this.logger.log(`Registered event handler '${handler.constructor.name}' for topic '${topicName}' and event name '${eventName}'.   (${topicHandlers.length} handlers total)`);
  }

  /**
   * Handle incoming messages from the event source
   * Parses the message and delegates to the appropriate event handler
   */
  public async handleMessage(topicName: string, message: ParsedIntegrationMessage) {
    try {

      // Find the appropriate event handler based on event type
      const topicHandlers = this.eventHandlers.get(topicName);
      if (!topicHandlers || topicHandlers.length === 0) {
        this.logger.debug(`No handlers registered for topic '${topicName}', skipping message [${message.id}]`);
        return;
      }

      const eventName = message.name || 'Unknown';
      const handlerInfo = topicHandlers.find(info => info.eventName === eventName);

      if (!handlerInfo) {
        this.logger.debug(`No handler registered for topic '${topicName}' and event name '${eventName}', skipping message [${message.id}]`);
        this.logger.debug(`Available handlers for topic: ${topicHandlers.map(h => h.eventName).join(', ')}`);
        return;
      }

      await handlerInfo.handler.handle(message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Error handling message for topic '${topicName}': ${errorMessage} ${errorStack}`);
      throw error;
    }
  }

  /**
   * Abstract methods that subclasses must implement
   */
  protected abstract subscribeToTopic(topicName: string): Promise<void>;
  protected abstract unsubscribeFromTopic(topicName: string): Promise<void>;
  protected abstract parseMessage(rawMessage: unknown): ParsedIntegrationMessage;
}
