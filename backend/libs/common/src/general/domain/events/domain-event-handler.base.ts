import type { IEventHandler } from '@nestjs/cqrs';
import type { DomainEvent } from './domain-event.base';
import { TracingService } from './../../../tracing';
import { CorrelationLogger } from './../../../logger';

export abstract class DomainEventHandlerBase<T extends DomainEvent> implements IEventHandler<T> {
  protected readonly logger: CorrelationLogger;
  constructor() {
    this.logger = new CorrelationLogger(DomainEventHandlerBase.name);
  }

  async handle(event: T): Promise<void> {
    const metadata = TracingService.getTracingMetadata();
    const newMetadata = TracingService.createTracingMetadata(metadata);

    return await TracingService.runWithContext(newMetadata, () => {
      this.logger.log(`Handling domain event: ${event.constructor.name}`);
      return this.handleEvent(event);
    });
  }

  abstract handleEvent(event: T): Promise<void>;
}
