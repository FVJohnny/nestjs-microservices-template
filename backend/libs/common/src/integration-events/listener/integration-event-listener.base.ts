import { Injectable } from '@nestjs/common';

import type { ParsedIntegrationMessage } from '../types/integration-event.types';
import { CorrelationLogger } from '../../logger';
import { InboxService } from '../../inbox';
import { WithSpan } from '../../tracing';

export interface IIntegrationEventHandler {
  handle(message: ParsedIntegrationMessage): Promise<void>;
}
interface HandlerInfo {
  handler: IIntegrationEventHandler;
  eventName: string;
  handlerName: string;
}

export const INTEGRATION_EVENT_LISTENER = 'IntegrationEventListener';
export interface IntegrationEventListener {
  registerEventHandler(
    topicName: string,
    eventName: string,
    handler: IIntegrationEventHandler,
  ): Promise<void>;
  handleMessage(topicName: string, message: ParsedIntegrationMessage): Promise<boolean>;
}

/**
 * Abstract base class for EventListener implementations
 * Provides common functionality for managing event handlers and listening state
 */
@Injectable()
export abstract class BaseIntegrationEventListener implements IntegrationEventListener {
  protected readonly logger = new CorrelationLogger(this.constructor.name);
  protected readonly eventHandlers = new Map<string, HandlerInfo[]>(); // topic -> array of handlers

  constructor(private readonly inboxService?: InboxService) {}

  async registerEventHandler(
    topicName: string,
    eventName: string,
    handler: IIntegrationEventHandler,
  ) {
    const existingHandler = this.getEventHandler(topicName, eventName);
    if (existingHandler) {
      this.logger.warn(
        `Tried to register handler '${handler.constructor.name}' for topic '${topicName}' and event type '${eventName}' ` +
          `but it already exists on handler '${existingHandler.handlerName}'`,
      );
      return;
    }

    // Add handler to the topic's handler list
    const topicHandlers = this.addEventHandler(topicName, eventName, handler);

    // Subscribe to topic if this is the first handler for this topic
    if (topicHandlers.length === 1) {
      await this.subscribeToTopic(topicName);
    }

    this.logger.log(
      `Registered event handler '${handler.constructor.name}' for topic '${topicName}' and event name '${eventName}'.   (${topicHandlers.length} handlers total)`,
    );
  }

  private getEventHandler(topicName: string, eventName: string): HandlerInfo | undefined {
    const topicHandlers = this.eventHandlers.get(topicName) || [];
    return topicHandlers.find((info) => info.eventName === eventName);
  }

  private addEventHandler(topicName: string, eventName: string, handler: IIntegrationEventHandler) {
    const topicHandlers = this.eventHandlers.get(topicName) || [];
    topicHandlers.push({
      handler,
      eventName,
      handlerName: handler.constructor.name,
    });
    this.eventHandlers.set(topicName, topicHandlers);

    return topicHandlers;
  }

  /**
   * Handle incoming messages from the event source
   * Parses the message and delegates to the appropriate event handler
   */
  @WithSpan('integration_event_listener.process_event', {
    attributesFrom: ['name'],
    prefix: 'integration_event_listener.process_event',
  })
  public async handleMessage(topicName: string, message: ParsedIntegrationMessage) {
    if (this.inboxService) {
      await this.inboxService.receiveMessage(message, topicName);
      return true;
    }

    // Find the appropriate event handler based on event type
    const eventHandler = this.getEventHandler(topicName, message.name);
    if (!eventHandler) {
      this.logger.debug(
        `No handler registered for topic '${topicName}' and event name '${message.name}', skipping message [${message.id}]`,
      );
      return false;
    }

    await eventHandler.handler.handle(message);
    return true;
  }

  /**
   * Abstract methods that subclasses must implement
   */
  protected abstract subscribeToTopic(topicName: string): Promise<void>;
  protected abstract unsubscribeFromTopic(topicName: string): Promise<void>;
  protected abstract parseMessage(rawMessage: unknown): ParsedIntegrationMessage;
}
