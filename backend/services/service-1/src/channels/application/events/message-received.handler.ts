import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { MessageReceivedEvent } from '../../domain/events/message-received.event';
import type { KafkaMessagePublisher } from './channel-registered.handler';

@EventsHandler(MessageReceivedEvent)
export class MessageReceivedHandler implements IEventHandler<MessageReceivedEvent> {
  private readonly logger = new Logger(MessageReceivedHandler.name);

  constructor(
    @Inject('KafkaMessagePublisher')
    private readonly kafkaPublisher: KafkaMessagePublisher,
  ) {}

  async handle(event: MessageReceivedEvent): Promise<void> {
    this.logger.log(`Handling MessageReceivedEvent for channel: ${event.aggregateId}`);

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
      await this.kafkaPublisher.publish('example-topic', message);
      this.logger.log(`Published MessageReceivedEvent to Kafka: ${event.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to publish MessageReceivedEvent: ${error.message}`, error.stack);
      throw error;
    }
  }
}
