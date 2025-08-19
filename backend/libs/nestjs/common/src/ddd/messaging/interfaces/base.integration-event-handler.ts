import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { EventHandler, IntegrationEventListener } from './event-listener.interface';
import { INTEGRATION_EVENT_LISTENER_TOKEN } from '../../index';

/**
 * Base event handler that auto-registers itself with its topic
 * Eliminates the need for separate topic handler classes
 */
@Injectable()
export abstract class BaseIntegrationEventHandler implements EventHandler, OnModuleInit {
  protected readonly logger = new Logger(this.constructor.name);

  abstract readonly topicName: string;

  constructor(@Inject(INTEGRATION_EVENT_LISTENER_TOKEN) private readonly integrationEventListener: IntegrationEventListener) {}

  async onModuleInit() {
    // Auto-register this event handler with its topic
    await this.integrationEventListener.registerEventHandler(this.topicName, this);
  }

  abstract handle(payload: Record<string, unknown>, messageId: string): Promise<void>;
}
