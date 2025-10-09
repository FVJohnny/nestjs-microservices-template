import { Inject, Injectable, OnModuleInit, Optional, Type } from '@nestjs/common';

import { BaseIntegrationEvent } from '../events';
import { ParsedIntegrationMessage } from '../types/integration-event.types';
import {
  INTEGRATION_EVENT_LISTENER,
  type BaseIntegrationEventListener,
} from './base.integration-event-listener';
import { CorrelationLogger } from '../../logger';
import { InboxService } from '../../inbox';

// Contract the decorated class must implement
type HandlesIntegrationEvent<TEvent extends BaseIntegrationEvent> = {
  handleEvent(event: TEvent): Promise<void>;
};

// Constructor type that includes static side of BaseIntegrationEvent (e.g., fromJSON)
export type IntegrationEventCtor<TEvent extends BaseIntegrationEvent> = Type<TEvent> &
  typeof BaseIntegrationEvent;

/**
 * Decorator.
 */
export function IntegrationEventHandler<TEvent extends BaseIntegrationEvent>(
  eventCtor: IntegrationEventCtor<TEvent>,
) {
  return function <TTarget extends Type<HandlesIntegrationEvent<TEvent>>>(Target: TTarget) {
    @Injectable()
    class Wrapped extends Target implements OnModuleInit {
      public readonly logger = new CorrelationLogger(Target.name);
      public readonly eventClass = eventCtor;

      @Inject(INTEGRATION_EVENT_LISTENER)
      public readonly integrationEventListener: BaseIntegrationEventListener;

      @Inject()
      @Optional()
      public readonly inboxService?: InboxService;

      async onModuleInit() {
        await this.integrationEventListener.registerEventHandler(
          this.eventClass.topic,
          this.eventClass.name,
          this,
        );

        if (this.inboxService) {
          await this.inboxService.registerEventHandler(
            this.eventClass.topic,
            this.eventClass.name,
            this,
          );
        }
      }

      async handle(message: ParsedIntegrationMessage) {
        const event = this.eventClass.fromJSON(message) as TEvent;
        await this.handleEvent(event);
      }
    }

    // Preserve the original class name for better logs/DI debugging
    Object.defineProperty(Wrapped, 'name', { value: Target.name });
    return Wrapped;
  };
}
