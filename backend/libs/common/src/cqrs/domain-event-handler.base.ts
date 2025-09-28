import type { IEventHandler } from '@nestjs/cqrs';
import { CorrelationLogger } from '../logger';
import { TracingService } from '../tracing';
import type { DomainEvent } from './domain-event.base';

export abstract class DomainEventHandlerBase<T extends DomainEvent> implements IEventHandler<T> {
  protected readonly logger: CorrelationLogger;
  constructor() {
    this.logger = new CorrelationLogger(this.constructor.name);
  }

  async handle(event: T) {
    await TracingService.runWithNewMetadata(() => {
      this.logger.log(`Handling domain event: ${event.constructor.name}`);
      return this.handleEvent(event);
    });
  }

  abstract handleEvent(event: T): Promise<void>;
}
