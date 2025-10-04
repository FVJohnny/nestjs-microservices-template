import type { IEventHandler } from '@nestjs/cqrs';
import { CorrelationLogger } from '../logger';
import type { DomainEvent } from './domain-event.base';
import { TracingService } from '../tracing';

export abstract class DomainEventHandlerBase<T extends DomainEvent> implements IEventHandler<T> {
  protected readonly logger: CorrelationLogger;
  constructor() {
    this.logger = new CorrelationLogger(this.constructor.name);
  }

  async handle(event: T) {
    return TracingService.withSpan(
      `domain-event-handler.${event.constructor.name}`,
      async () => {
        this.logger.log(`Handling domain event: ${event.constructor.name}`);
        return this.handleEvent(event);
      },
      {
        'domain-event.name': event.constructor.name,
      },
    );
  }

  abstract handleEvent(event: T): Promise<void>;
}
