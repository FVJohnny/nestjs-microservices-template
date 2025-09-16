import type { IEvent } from '@nestjs/cqrs';

import { TracingMetadata } from '../../../tracing/tracing-metadata';
import type { Id } from '../value-object/Id';

/**
 * Base class for all domain events in the system.
 * Provides common properties and behavior for domain events.
 */
export abstract class DomainEvent implements IEvent {
  public readonly occurredOn: Date;
  public readonly metadata: TracingMetadata;

  constructor(
    public readonly aggregateId: Id,
    metadata?: TracingMetadata,
  ) {
    this.occurredOn = new Date();
    this.metadata = metadata ?? new TracingMetadata();
  }

  /**
   * Gets the name of the event class
   */
  get name(): string {
    return this.constructor.name;
  }
}
