import type { TracingMetadataParams } from '../../tracing/tracing-metadata';
import { BaseIntegrationEvent, type BaseIntegrationEventProps } from './base-integration-event';
import { Topics } from './topics';

/**
 * Integration event received from trading signals service.
 * Contains channel creation information from external trading platform.
 */

export interface TradingSignalReceivedIntegrationEventProps extends BaseIntegrationEventProps {
  signalType?: string;
  source?: string;
}
export class TradingSignalReceivedIntegrationEvent extends BaseIntegrationEvent {
  readonly version = '1.0';
  readonly name = Topics.TRADING_SIGNALS.events.TRADING_SIGNAL_RECEIVED;
  readonly topic = Topics.TRADING_SIGNALS.topic;

  constructor(props: TradingSignalReceivedIntegrationEventProps, metadata?: TracingMetadataParams) {
    super(props, metadata);

    this.validate();
  }

  /**
   * Returns the event-specific data payload
   */
  protected toEventJSON(): Record<string, unknown> {
    return {};
  }

  /**
   * Validates trading signal requirements
   */
  validate(): void {
    super.validate();
  }

  /**
   * Creates an event from a JSON message payload
   */
  static fromJSON(json: Record<string, unknown>): TradingSignalReceivedIntegrationEvent {
    const event = new TradingSignalReceivedIntegrationEvent(
      {
        occurredOn: json.occurredOn ? new Date(json.occurredOn as string) : undefined,
      },
      json.metadata as TracingMetadataParams | undefined,
    );
    event.validate();
    return event;
  }
}
