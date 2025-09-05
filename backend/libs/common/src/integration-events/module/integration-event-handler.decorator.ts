/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject,Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { BaseIntegrationEvent } from '../events';
import { ParsedIntegrationMessage } from '../types/integration-event.types';
import { type BaseIntegrationEventListener, INTEGRATION_EVENT_LISTENER_TOKEN } from './integration-event-listener.base';

// Interface for the handler instance that the decorator expects
interface IntegrationEventHandlerInstance {
  handleEvent(event: BaseIntegrationEvent): Promise<void>;
}

// Interface for handler registration
interface HandlerForRegistration {
  readonly topicName: string;
  handle(payload: ParsedIntegrationMessage): Promise<void>;
}

/**
 * Decorator that automatically configures an integration event handler
 * Creates a complete integration event handler without needing to extend any base class
 */
export function IntegrationEventHandler<T extends BaseIntegrationEvent>(
  eventClass: (new (...args: any[]) => T) & { fromJSON(json: unknown): T }
) {
  return function <U extends new (...args: any[]) => IntegrationEventHandlerInstance>(constructor: U) {
    // Apply @Injectable decorator
    Injectable()(constructor);
    
    // Extract topic from event class by creating a temporary instance
    // We need to handle the case where constructor requires specific props
    let topicName: string;
    try {
      // Try to create instance with empty payload first
      const tempInstance = new eventClass({});
      topicName = tempInstance.getTopic();
    } catch {
      // If that fails, try with channel-specific props for backward compatibility
      try {
        const tempInstance = new eventClass({
          channelType: 'temp',
          name: 'temp', 
          userId: 'temp',
          connectionConfig: {}
        });
        topicName = tempInstance.getTopic();
      } catch {
            // If both fail, try to access the topic property from a prototype instance
        try {
          const prototype = eventClass.prototype;
          topicName = prototype.topic || '';
        } catch {
          topicName = '';
        }
      }
    }
    
    // Create a new class that extends the original and adds all the base functionality
    class IntegrationEventHandlerClass extends constructor implements OnModuleInit {
      protected readonly logger = new Logger(this.constructor.name);
      eventClass = eventClass;
      readonly topicName = topicName;
      
      @Inject(INTEGRATION_EVENT_LISTENER_TOKEN)
      private readonly integrationEventListener!: BaseIntegrationEventListener;
      
      constructor(...args: any[]) {
        super(...args);
      }
      
      async onModuleInit() {
        const handler = this as unknown as HandlerForRegistration;
        await this.integrationEventListener.registerEventHandler(this.topicName, handler);
      }
      
      async handle(message: ParsedIntegrationMessage): Promise<void> {
        const event = eventClass.fromJSON(message);
        const instance = this as unknown as IntegrationEventHandlerInstance;
        this.logger.log(
          `Processing ${this.topicName} event [${message.id}] - ${event.name}`,
        );
        await instance.handleEvent(event);
      }
    }
    
    // Preserve the original class name
    Object.defineProperty(IntegrationEventHandlerClass, 'name', {
      value: constructor.name
    });
    
    return IntegrationEventHandlerClass as U;
  };
}