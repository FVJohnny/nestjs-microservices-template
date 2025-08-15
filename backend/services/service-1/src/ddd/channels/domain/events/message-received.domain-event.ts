import { DomainEvent } from '@libs/nestjs-ddd';

export class MessageReceivedDomainEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly messageId: string,
    public readonly content: string,
    public readonly senderId: string,
    public readonly senderName: string,
    public readonly timestamp: Date,
    public readonly metadata: Record<string, any> = {},
  ) {
    super(aggregateId);
  }

  protected getPayload(): Record<string, any> {
    return {
      messageId: this.messageId,
      content: this.content,
      senderId: this.senderId,
      senderName: this.senderName,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata,
    };
  }
}
