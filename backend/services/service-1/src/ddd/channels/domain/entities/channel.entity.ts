import { v4 as uuidv4 } from 'uuid';
import { AggregateRoot, IEvent } from '@nestjs/cqrs';
import { ChannelTypeVO } from '../value-objects/channel-type.vo';
import { ChannelRegisteredEvent } from '../events/channel-registered.event';
import { MessageReceivedEvent } from '../events/message-received.event';

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
      new ChannelRegisteredEvent({
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
      throw new Error('Cannot receive messages on inactive channel');
    }

    // Raise domain event
    this.apply(
      new MessageReceivedEvent(
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
      throw new Error('Channel is already inactive');
    }

    // In a real implementation, you might raise a ChannelDeactivatedEvent
    // For now, we'll keep it simple
  }
}
