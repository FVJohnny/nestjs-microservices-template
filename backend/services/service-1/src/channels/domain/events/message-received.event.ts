import { IEvent } from '@nestjs/cqrs';

export class MessageReceivedEvent implements IEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly messageId: string,
    public readonly content: string,
    public readonly senderId: string,
    public readonly senderName: string,
    public readonly timestamp: Date,
    public readonly metadata: Record<string, any> = {},
    public readonly occurredOn: Date = new Date(),
  ) {}
}
