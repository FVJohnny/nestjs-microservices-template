import { BaseIntegrationEvent, BaseIntegrationEventProps } from './base-integration-event';
import { Topics } from './topics';

/**
 * Integration event received from trading signals service.
 * Contains channel creation information from external trading platform.
 */

export interface TradingSignalReceivedIntegrationEventProps extends BaseIntegrationEventProps {
}
export class TradingSignalReceivedIntegrationEvent extends BaseIntegrationEvent {
  readonly eventVersion = '1.0';
  readonly eventName = Topics.TRADING_SIGNALS.events.TRADING_SIGNAL_RECEIVED;
  readonly topic = Topics.TRADING_SIGNALS.topic;


  constructor(props: TradingSignalReceivedIntegrationEventProps) {
    super(props.occurredOn);

    this.validate();
  }

  /**
   * Returns the event-specific data payload
   */
  protected getEventData(): Record<string, any> {
    return {
    };
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
  static fromJSON(json: any): TradingSignalReceivedIntegrationEvent {
    const event = new TradingSignalReceivedIntegrationEvent({
    });
    event.validate();
    return event;
  }
}