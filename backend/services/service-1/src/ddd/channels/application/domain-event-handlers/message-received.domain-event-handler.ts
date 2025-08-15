import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import type { MessagePublisher } from '@libs/nestjs-ddd';
import { MESSAGE_PUBLISHER_TOKEN } from '@libs/nestjs-ddd';
import { CorrelationLogger } from '@libs/nestjs-common';
import { MessageReceivedDomainEvent } from '../../domain/events/message-received.domain-event';

@EventsHandler(MessageReceivedDomainEvent)
export class MessageReceivedDomainEventHandler implements IEventHandler<MessageReceivedDomainEvent> {
  private readonly logger = new CorrelationLogger(MessageReceivedDomainEventHandler.name);

  constructor(
    @Inject(MESSAGE_PUBLISHER_TOKEN)
    private readonly messagePublisher: MessagePublisher,
  ) {}

  async handle(event: MessageReceivedDomainEvent): Promise<void> {
    this.logger.log(
      `Handling MessageReceivedEvent for channel: ${event.aggregateId}`,
    );

    const message = {
      eventId: `${event.messageId}-${Date.now()}`,
      eventName: event.constructor.name,
      aggregateId: event.aggregateId,
      messageId: event.messageId,
      content: event.content,
      senderId: event.senderId,
      senderName: event.senderName,
      timestamp: event.timestamp.toISOString(),
      occurredOn: event.occurredOn.toISOString(),
      metadata: event.metadata,
    };

    try {
      await this.messagePublisher.publish('example-topic', message);
      this.logger.log(
        `Published MessageReceivedEvent to message broker: ${event.messageId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to publish MessageReceivedEvent`, error);
      throw error;
    }
  }
}
