import { ApplicationException } from '../../errors';
import { Id } from '../../general';
import { TracingService } from '../../tracing';

/**
 * Base interface for all integration event props.
 * All integration events should extend this for their constructor props.
 */
export interface BaseIntegrationEventProps {
  id?: string;
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

  readonly id: string;
  readonly occurredOn: Date;

  constructor(props: BaseIntegrationEventProps) {
    this.id = props.id || Id.random().toValue();
    this.occurredOn = props.occurredOn || new Date();
  }

  /**
   * Converts the event to a JSON message payload.
   *
   * Note: Includes trace metadata for transports that don't support trace propagation
   * via headers (e.g., Redis pub/sub). For transports with header support (e.g., Kafka),
   * OpenTelemetry automatically propagates trace context via headers.
   */
  toJSON(): Record<string, unknown> {
    const metadata = TracingService.getTraceMetadata();

    return {
      id: this.id,
      occurredOn: this.occurredOn.toISOString(),
      // Include trace metadata for Redis/transports without header support
      metadata: metadata || {},
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
  protected validate(): void {
    if (!this.id) throw new ApplicationException('id is required');
    if (!this.occurredOn) throw new ApplicationException('occurredOn is required');
  }

  /**
   * Subclasses must implement this to return their specific event data.
   */
  protected abstract toEventJSON(): Record<string, unknown>;
}
