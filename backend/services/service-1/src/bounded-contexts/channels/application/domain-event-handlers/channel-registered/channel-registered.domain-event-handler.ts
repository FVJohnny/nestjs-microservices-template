import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ChannelRegisteredDomainEvent } from '../../../domain/events/channel-registered.domain-event';
import { 
  ChannelCreatedIntegrationEvent,
  type IntegrationEventPublisher,
  CorrelationLogger,
  INTEGRATION_EVENT_PUBLISHER_TOKEN 
} from '@libs/nestjs-common';

@EventsHandler(ChannelRegisteredDomainEvent)
export class ChannelRegisteredDomainEventHandler
  implements IEventHandler<ChannelRegisteredDomainEvent>
{
  private readonly logger = new CorrelationLogger(
    ChannelRegisteredDomainEventHandler.name,
  );

  constructor(
    @Inject(INTEGRATION_EVENT_PUBLISHER_TOKEN)
    private readonly integrationEventPublisher: IntegrationEventPublisher,
  ) {}

  async handle(event: ChannelRegisteredDomainEvent): Promise<void> {
    this.logger.log('Handling ChannelRegisteredDomainEvent...');

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
      await this.integrationEventPublisher.publish(
        integrationEvent.getTopic(),
        integrationEvent.toJSON(),
      );
    } catch (error) {
      this.logger.error(`Failed to publish integration event`, error);
      throw error;
    }
  }
}
