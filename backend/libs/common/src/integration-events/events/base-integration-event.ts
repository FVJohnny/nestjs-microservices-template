import { TracingMetadata } from '../../tracing';

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
  static readonly version: string;
  static readonly name: string;
  static readonly topic: string;

  readonly occurredOn: Date;
  readonly metadata: TracingMetadata;

  constructor(props: BaseIntegrationEventProps, metadata?: TracingMetadata) {
    this.occurredOn = props.occurredOn || new Date();
    this.metadata = metadata ?? new TracingMetadata();
  }

  /**
   * Converts the event to a JSON message payload.
   */
  toJSON(): Record<string, unknown> {
    return {
      occurredOn: this.occurredOn.toISOString(),
      metadata: this.metadata.toJSON(),
      ...this.toEventJSON(),
    };
  }

  toJSONString(): string {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Base implementation for creating events from JSON messages.
   * Subclasses should override this method.
   */
  static fromJSON(json: Record<string, unknown>): BaseIntegrationEvent {
    throw new Error(
      `${this.name}.fromJSON() must be implemented by subclass. Received: ${Object.keys(json).join(', ')}`,
    );
  }

  /**
   * Validates the event before publishing.
   * Subclasses can override to add specific validation.
   */
  validate(): void {
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
  protected abstract toEventJSON(): Record<string, unknown>;
}
