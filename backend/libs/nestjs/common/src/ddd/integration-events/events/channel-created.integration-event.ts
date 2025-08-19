import { BaseIntegrationEvent, BaseIntegrationEventProps } from './base-integration-event';
import { INTEGRATION_EVENT_TOPIC_CHANNELS } from './topics';

/**
 * Integration event published to Event Broker when a channel is created.
 * This is the external contract - keep it stable and versioned.
 * 
 * Consumed by: analytics-service, notification-service, audit-service
 */

export interface ChannelCreatedIntegrationEventProps extends BaseIntegrationEventProps {
  channelId: string;
  channelType: string;
  userId: string;
  channelName: string;
}

export class ChannelCreatedIntegrationEvent extends BaseIntegrationEvent {
  readonly eventVersion = '1.0';
  readonly eventName = 'channel.created';
  readonly topic = INTEGRATION_EVENT_TOPIC_CHANNELS;

  public readonly channelId: string;
  public readonly channelType: string;
  public readonly userId: string;
  public readonly channelName: string;

  constructor(props: ChannelCreatedIntegrationEventProps) {
    super(props.occurredOn);
    this.channelId = props.channelId;
    this.channelType = props.channelType;
    this.userId = props.userId;
    this.channelName = props.channelName;

    this.validate();
  }

  /**
   * Returns the event-specific data payload
   */
  protected getEventData(): Record<string, any> {
    return {
      channelId: this.channelId,
      channelType: this.channelType,
      userId: this.userId,
      channelName: this.channelName,
    };
  }

  /**
   * Validates channel-specific requirements
   */
  validate(): void {
    super.validate();
    
    if (!this.channelId) {
      throw new Error('channelId is required');
    }
    if (!this.channelType) {
      throw new Error('channelType is required');
    }
    if (!this.userId) {
      throw new Error('userId is required');
    }
    if (!this.channelName) {
      throw new Error('channelName is required');
    }
  }

  /**
   * Creates an event from a JSON message payload
   */
  static fromJSON(json: any): ChannelCreatedIntegrationEvent {
    const event = new ChannelCreatedIntegrationEvent({
      channelId: json.channelId,
      channelType: json.channelType,
      userId: json.userId,
      channelName: json.channelName,
      occurredOn: new Date(json.occurredOn),
    });
    event.validate();
    return event;
  }
}