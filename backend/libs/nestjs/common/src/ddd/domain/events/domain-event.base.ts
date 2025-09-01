import { IEvent } from '@nestjs/cqrs';
import { TracingMetadata, TracingMetadataParams } from '../../../tracing/tracing-metadata';

/**
 * Base class for all domain events in the system.
 * Provides common properties and behavior for domain events.
 */
export abstract class DomainEvent implements IEvent {
  public readonly occurredOn: Date;
  public readonly eventId: string;
  public readonly metadata?: TracingMetadata;

  constructor(
    public readonly aggregateId: string,
    eventId?: string,
    metadataParams?: TracingMetadataParams,
  ) {
    this.occurredOn = new Date();
    this.eventId = eventId || `${aggregateId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.metadata = new TracingMetadata(metadataParams);
  }

  /**
   * Gets the name of the event class
   */
  get eventName(): string {
    return this.constructor.name;
  }
}
