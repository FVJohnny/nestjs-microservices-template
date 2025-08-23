import { BaseIntegrationEvent, BaseIntegrationEventProps } from './base-integration-event';
import { INTEGRATION_EVENT_TOPIC_TRADING_SIGNALS } from './topics';

/**
 * Integration event received from trading signals service.
 * Contains channel creation information from external trading platform.
 */

export interface TradingSignalReceivedIntegrationEventProps extends BaseIntegrationEventProps {
  channelType: string;
  name: string;
  userId: string;
  connectionConfig?: Record<string, unknown>;
}
export class TradingSignalReceivedIntegrationEvent extends BaseIntegrationEvent {
  readonly eventVersion = '1.0';
  readonly eventName = 'trading-signal.received';
  readonly topic = INTEGRATION_EVENT_TOPIC_TRADING_SIGNALS;

  public readonly channelType: string;
  public readonly name: string;
  public readonly userId: string;
  public readonly connectionConfig: Record<string, unknown>;

  constructor(props: TradingSignalReceivedIntegrationEventProps) {
    super(props.occurredOn);
    this.channelType = props.channelType;
    this.name = props.name;
    this.userId = props.userId;
    this.connectionConfig = props.connectionConfig || {};

    this.validate();
  }

  /**
   * Returns the event-specific data payload
   */
  protected getEventData(): Record<string, any> {
    return {
      channelType: this.channelType,
      name: this.name,
      userId: this.userId,
      connectionConfig: this.connectionConfig,
    };
  }

  /**
   * Validates trading signal requirements
   */
  validate(): void {
    super.validate();
    
    if (!this.channelType) {
      throw new Error('channelType is required');
    }
    if (!this.name) {
      throw new Error('name is required');
    }
    if (!this.userId) {
      throw new Error('userId is required');
    }
  }

  /**
   * Creates an event from a JSON message payload
   */
  static fromJSON(json: any): TradingSignalReceivedIntegrationEvent {
    const event = new TradingSignalReceivedIntegrationEvent({
      channelType: json.channelType,
      name: json.name,
      userId: json.userId,
      connectionConfig: json.connectionConfig,
      occurredOn: json.occurredOn ? new Date(json.occurredOn) : new Date(),
    });
    event.validate();
    return event;
  }
}