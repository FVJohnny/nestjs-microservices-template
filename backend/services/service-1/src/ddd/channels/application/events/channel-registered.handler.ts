import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ChannelRegisteredEvent } from '../../domain/events/channel-registered.event';
import { ChannelCreatedIntegrationEvent } from '@libs/nestjs-types';
import type { MessagePublisher } from '@libs/nestjs-ddd';
import { CorrelationLogger } from '@libs/nestjs-common';

@EventsHandler(ChannelRegisteredEvent)
export class ChannelRegisteredEventHandler
  implements IEventHandler<ChannelRegisteredEvent>
{
  private readonly logger = new CorrelationLogger(
    ChannelRegisteredEventHandler.name,
  );

  constructor(
    @Inject('MessagePublisher')
    private readonly messagePublisher: MessagePublisher,
  ) {}

  async handle(event: ChannelRegisteredEvent): Promise<void> {
    this.logger.log('Handling ChannelRegisteredEvent...');

    // Transform domain event to integration event
    const integrationEvent = new ChannelCreatedIntegrationEvent({
      channelId: event.aggregateId,
      channelType: event.channelType.getValue(),
      userId: event.userId,
      channelName: event.channelName,
      occurredOn: event.occurredOn,
    });

    try {
      // Publish integration event to Kafka using the event's topic
      await this.messagePublisher.publish(
        integrationEvent.getTopic(),
        integrationEvent.toJSON(),
      );
      
      this.logger.log(
        `Published ChannelCreatedIntegrationEvent to topic '${integrationEvent.getTopic()}': ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to publish integration event`, error);
      throw error;
    }
  }
}
