import { IEvent } from '@nestjs/cqrs';
import { ChannelType } from '../value-objects/channel-type.vo';

export class ChannelRegisteredEvent implements IEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly channelType: ChannelType,
    public readonly channelName: string,
    public readonly userId: string,
    public readonly connectionConfig: Record<string, any>,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
