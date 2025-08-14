import { IEvent } from '@nestjs/cqrs';

/**
 * Base class for all domain events in the system.
 * Provides common properties and behavior for domain events.
 */
export abstract class DomainEvent implements IEvent {
  public readonly occurredOn: Date;
  public readonly eventId: string;

  constructor(
    public readonly aggregateId: string,
    eventId?: string,
  ) {
    this.occurredOn = new Date();
    this.eventId = eventId || `${aggregateId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gets the name of the event class
   */
  get eventName(): string {
    return this.constructor.name;
  }

  /**
   * Converts the event to a plain object for serialization
   */
  toPlainObject(): Record<string, any> {
    return {
      eventId: this.eventId,
      eventName: this.eventName,
      aggregateId: this.aggregateId,
      occurredOn: this.occurredOn.toISOString(),
      ...this.getPayload(),
    };
  }

  /**
   * Override this method to provide event-specific payload
   */
  protected abstract getPayload(): Record<string, any>;
}
