import { TracingMetadata, TracingMetadataParams } from "../../ddd";

/**
 * Base interface for all integration event props.
 * All integration events should extend this for their constructor props.
 */
export interface BaseIntegrationEventProps {
  occurredOn?: Date;
}

/**
 * Base class for all integration events.
 * Enforces common properties and provides standard serialization/deserialization.
 */
export abstract class BaseIntegrationEvent {
  abstract readonly eventVersion: string;
  abstract readonly eventName: string;
  abstract readonly topic: string;
  readonly occurredOn: Date;
  readonly metadata?: TracingMetadata;

  constructor(props: BaseIntegrationEventProps, metadata?: TracingMetadataParams) {
    this.occurredOn = props.occurredOn || new Date();
    this.metadata = new TracingMetadata(metadata);
  }

  /**
   * Gets the topic for this event type
   */
  getTopic(): string {
    return this.topic;
  }

  /**
   * Converts the event to a JSON message payload.
   */
  toJSON(): Record<string, any> {
    return {
      eventName: this.eventName,
      eventVersion: this.eventVersion,
      topic: this.topic,
      occurredOn: this.occurredOn.toISOString(),
      metadata: this.metadata?.toJSON(),
      data: this.toEventJSON(),
    };
  }

  /**
   * Base implementation for creating events from JSON messages.
   * Subclasses should override this method.
   */
  static fromJSON(json: any): BaseIntegrationEvent {
    throw new Error(`${this.name}.fromJSON() must be implemented by subclass`);
  }

  /**
   * Validates the event before publishing.
   * Subclasses can override to add specific validation.
   */
  validate(): void {
    if (!this.eventName) {
      throw new Error('eventName is required');
    }
    if (!this.eventVersion) {
      throw new Error('eventVersion is required');
    }
    if (!this.topic) {
      throw new Error('topic is required');
    }
    if (!this.occurredOn) {
      throw new Error('occurredOn is required');
    }
    if (!this.metadata) {
      throw new Error('metadata is required');
    }
  }

  /**
   * Subclasses must implement this to return their specific event data.
   */
  protected abstract toEventJSON(): Record<string, any>;

}