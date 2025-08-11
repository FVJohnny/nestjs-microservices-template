import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ChannelRegisteredEvent } from '../../domain/events/channel-registered.event';

export interface KafkaMessagePublisher {
  publish(topic: string, message: any): Promise<void>;
}

@EventsHandler(ChannelRegisteredEvent)
export class ChannelRegisteredHandler implements IEventHandler<ChannelRegisteredEvent> {
  private readonly logger = new Logger(ChannelRegisteredHandler.name);

  constructor(
    @Inject('KafkaMessagePublisher')
    private readonly kafkaPublisher: KafkaMessagePublisher,
  ) {}

  async handle(event: ChannelRegisteredEvent): Promise<void> {
    this.logger.log(`Handling ChannelRegisteredEvent for channel: ${event.aggregateId}`);

    const message = {
      eventId: `${event.aggregateId}-${Date.now()}`,
      eventName: event.constructor.name,
      aggregateId: event.aggregateId,
      channelType: event.channelType,
      channelName: event.channelName,
      userId: event.userId,
      occurredOn: event.occurredOn.toISOString(),
      metadata: {
        hasConnectionConfig: !!event.connectionConfig,
      },
    };

    try {
      await this.kafkaPublisher.publish('channel-events', message);
      this.logger.log(`Published ChannelRegisteredEvent to Kafka: ${event.aggregateId}`);
    } catch (error) {
      this.logger.error(`Failed to publish ChannelRegisteredEvent: ${error.message}`, error.stack);
      throw error;
    }
  }
}
