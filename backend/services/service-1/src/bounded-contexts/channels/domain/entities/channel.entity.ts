import { v4 as uuidv4 } from 'uuid';
import { AggregateRoot, IEvent } from '@nestjs/cqrs';
import { ChannelTypeVO } from '../value-objects/channel-type.vo';
import { ChannelRegisteredDomainEvent } from '../events/channel-registered.domain-event';
import { MessageReceivedDomainEvent } from '../events/message-received.domain-event';
import { InvalidOperationException } from '@libs/nestjs-common';

interface CreateChannelProps {
  channelType: string;
  name: string;
  userId: string;
  connectionConfig: Record<string, any>;
}
export class Channel extends AggregateRoot<IEvent> {
  constructor(
    public readonly id: string,
    public readonly channelType: ChannelTypeVO,
    public readonly name: string,
    public readonly userId: string,
    public readonly connectionConfig: Record<string, any>,
    public isActive: boolean = true,
    public readonly createdAt: Date = new Date(),
  ) {
    super();
  }

  static create(props: CreateChannelProps): Channel {
    const id = uuidv4();
    const channelTypeVO = ChannelTypeVO.create(props.channelType);

    const channel = new Channel(
      id,
      channelTypeVO,
      props.name,
      props.userId,
      props.connectionConfig,
    );

    // Raise domain event
    channel.apply(
      new ChannelRegisteredDomainEvent({
        aggregateId: id,
        channelType: channelTypeVO,
        channelName: props.name,
        userId: props.userId,
        connectionConfig: props.connectionConfig,
      }),
    );

    return channel;
  }

  static random(props?: Partial<CreateChannelProps>) {
    return Channel.create({
      channelType: props?.channelType || 'telegram',
      userId: props?.userId || 'user-1',
      name: props?.name || 'My Beautiful Channel',
      connectionConfig: props?.connectionConfig || { token: 'abc' },
    });
  }

  receiveMessage(
    messageId: string,
    content: string,
    senderId: string,
    senderName: string,
    timestamp: Date = new Date(),
    metadata: Record<string, any> = {},
  ): void {
    if (!this.isActive) {
      throw new InvalidOperationException(
        'receive_message',
        'inactive_channel',
        {
          channelId: this.id,
          reason: 'Cannot receive messages on inactive channel',
        },
      );
    }

    // Raise domain event
    this.apply(
      new MessageReceivedDomainEvent(
        this.id,
        messageId,
        content,
        senderId,
        senderName,
        timestamp,
        metadata,
      ),
    );
  }

  deactivate(): void {
    if (!this.isActive) {
      throw new InvalidOperationException('deactivate', 'already_inactive', {
        channelId: this.id,
        reason: 'Channel is already inactive',
      });
    }

    this.isActive = false;

    // In a real implementation, you might raise a ChannelDeactivatedEvent
    // For now, we'll keep it simple
  }
}
