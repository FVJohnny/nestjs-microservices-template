import { Inject, Injectable, OnModuleInit } from '@nestjs/common';

import { BaseIntegrationEvent } from '../events';
import { ParsedIntegrationMessage } from '../types/integration-event.types';
import { INTEGRATION_EVENT_LISTENER } from './integration-event-listener.base';
import type { IntegrationEventListener } from './integration-event-listener.base';
import { CorrelationLogger } from '../../logger';

/**
 * Base event handler that auto-registers itself with its topic
 * Eliminates the need for separate topic handler classes
 *
 * @template T The specific integration event type this handler processes
 */
@Injectable()
export abstract class BaseIntegrationEventHandler<T extends BaseIntegrationEvent>
  implements IIntegrationEventHandler, OnModuleInit
{
  protected readonly logger = new CorrelationLogger(this.constructor.name);

  abstract readonly topicName: string;
  eventClass!: { fromJSON(json: unknown): T };

  constructor(
    @Inject(INTEGRATION_EVENT_LISTENER)
    private readonly integrationEventListener: IntegrationEventListener,
  ) {}

  async onModuleInit() {
    // Auto-register this event handler with its topic
    await this.integrationEventListener.registerEventHandler(this.topicName, this);
  }

  /**
   * Internal handler that deserializes the payload and calls the typed handler
   */
  async handle(message: ParsedIntegrationMessage): Promise<void> {
    const event = this.eventClass.fromJSON(message);
    this.logger.log(`Processing ${this.topicName} event [${message.id}] - ${event.name}`);
    await this.handleEvent(event);
  }

  /**
   * Implement this method to handle the typed event
   */
  protected abstract handleEvent(event: T): Promise<void>;
}

export interface IIntegrationEventHandler {
  readonly topicName: string;
  handle(message: ParsedIntegrationMessage): Promise<void>;
}
