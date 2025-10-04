import type { IEventHandler } from '@nestjs/cqrs';
import { CorrelationLogger } from '../logger';
import type { DomainEvent } from './domain-event.base';
import { WithSpan } from '../tracing';

export abstract class DomainEventHandlerBase<T extends DomainEvent> implements IEventHandler<T> {
  protected readonly logger: CorrelationLogger;
  constructor() {
    this.logger = new CorrelationLogger(this.constructor.name);
  }

  @WithSpan('domain_event.handle', { attributesFrom: ['constructor.name'] })
  async handle(event: T) {
    this.logger.log(`Handling domain event: ${event.constructor.name}`);
    return this.handleEvent(event);
  }

  abstract handleEvent(event: T): Promise<void>;
}
