import { DomainEvent } from '@libs/nestjs-common';
import { ChannelTypeVO } from '../value-objects/channel-type.vo';

export interface ChannelRegisteredDomainEventProps {
  aggregateId: string;
  channelType: ChannelTypeVO;
  channelName: string;
  userId: string;
  connectionConfig: Record<string, any>;
}

export class ChannelRegisteredDomainEvent extends DomainEvent {
  public readonly channelType: ChannelTypeVO;
  public readonly channelName: string;
  public readonly userId: string;
  public readonly connectionConfig: Record<string, any>;

  constructor(props: ChannelRegisteredDomainEventProps) {
    super(props.aggregateId);
    this.channelType = props.channelType;
    this.channelName = props.channelName;
    this.userId = props.userId;
    this.connectionConfig = props.connectionConfig;
  }

  protected getPayload(): Record<string, any> {
    return {
      channelType: this.channelType.getValue(),
      channelName: this.channelName,
      userId: this.userId,
      connectionConfig: this.connectionConfig,
    };
  }
}
