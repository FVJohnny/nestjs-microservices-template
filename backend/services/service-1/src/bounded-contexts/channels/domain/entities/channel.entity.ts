import { v4 as uuidv4 } from 'uuid';
import { AggregateRoot, IEvent } from '@nestjs/cqrs';
import { ChannelTypeVO } from '../value-objects/channel-type.vo';
import { ChannelRegisteredDomainEvent } from '../events/channel-registered.domain-event';
import { MessageReceivedDomainEvent } from '../events/message-received.domain-event';
import { InvalidOperationException } from '@libs/nestjs-common';

export class Channel extends AggregateRoot<IEvent> {
  constructor(
    public readonly id: string,
    public readonly channelType: ChannelTypeVO,
    public readonly name: string,
    public readonly userId: string,
    public readonly connectionConfig: Record<string, any>,
    public readonly isActive: boolean = true,
    public readonly createdAt: Date = new Date(),
  ) {
    super();
  }

  static create(
    channelType: string,
    name: string,
    userId: string,
    connectionConfig: Record<string, any>,
  ): Channel {
    const id = uuidv4();
    const channelTypeVO = ChannelTypeVO.create(channelType);

    const channel = new Channel(
      id,
      channelTypeVO,
      name,
      userId,
      connectionConfig,
    );

    // Raise domain event
    channel.apply(
      new ChannelRegisteredDomainEvent({
        aggregateId: id,
        channelType: channelTypeVO,
        channelName: name,
        userId: userId,
        connectionConfig: connectionConfig,
      }),
    );

    return channel;
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

    // In a real implementation, you might raise a ChannelDeactivatedEvent
    // For now, we'll keep it simple
  }
}
