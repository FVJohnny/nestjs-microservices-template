import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { MessageReceivedEvent } from '../../domain/events/message-received.event';
import type { MessagePublisher } from '@libs/nestjs-ddd';

@EventsHandler(MessageReceivedEvent)
export class MessageReceivedHandler implements IEventHandler<MessageReceivedEvent> {
  private readonly logger = new Logger(MessageReceivedHandler.name);

  constructor(
    @Inject('MessagePublisher')
    private readonly messagePublisher: MessagePublisher,
  ) {}

  async handle(event: MessageReceivedEvent): Promise<void> {
    this.logger.log(`[Event Handler - MessageReceivedEvent] Handling MessageReceivedEvent for channel: ${event.aggregateId}`);

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
      this.logger.log(`Published MessageReceivedEvent to message broker: ${event.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to publish MessageReceivedEvent: ${error.message}`, error.stack);
      throw error;
    }
  }
}
