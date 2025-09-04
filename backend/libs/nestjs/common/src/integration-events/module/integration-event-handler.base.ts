import { Inject, Injectable, Logger,OnModuleInit } from '@nestjs/common';

import { BaseIntegrationEvent } from '../events';
import { INTEGRATION_EVENT_LISTENER_TOKEN, IntegrationEventListener } from './integration-event-listener.base';



/**
 * Base event handler that auto-registers itself with its topic
 * Eliminates the need for separate topic handler classes
 * 
 * @template T The specific integration event type this handler processes
 */
@Injectable()
export abstract class BaseIntegrationEventHandler<T extends BaseIntegrationEvent> 
  implements IIntegrationEventHandler, OnModuleInit {
  protected readonly logger = new Logger(this.constructor.name);

  abstract readonly topicName: string;
  eventClass!: { fromJSON(json: any): T };

  constructor(
    @Inject(INTEGRATION_EVENT_LISTENER_TOKEN) private readonly integrationEventListener: IntegrationEventListener,
  ) {}

  async onModuleInit() {
    // Auto-register this event handler with its topic
    await this.integrationEventListener.registerEventHandler(this.topicName, this);
  }

  /**
   * Internal handler that deserializes the payload and calls the typed handler
   */
  async handle(payload: Record<string, unknown>, messageId: string): Promise<void> {
    const event = this.eventClass.fromJSON(payload);
    this.logger.log(
      `Processing ${this.topicName} event [${messageId}] - ${event.name}`,
    );
    await this.handleEvent(event, messageId);
  }

  /**
   * Implement this method to handle the typed event
   */
  protected abstract handleEvent(event: T, messageId: string): Promise<void>;
}

export interface IIntegrationEventHandler {
  readonly topicName: string;
  handle(payload: Record<string, unknown>, messageId: string): Promise<void>;
}
