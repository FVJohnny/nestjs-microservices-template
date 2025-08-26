import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UserRegisteredEvent } from '../../domain/events/user-registered.event';
import {
  UserCreatedIntegrationEvent,
  type IntegrationEventPublisher,
  CorrelationLogger,
  INTEGRATION_EVENT_PUBLISHER_TOKEN,
} from '@libs/nestjs-common';

@EventsHandler(UserRegisteredEvent)
export class UserRegisteredDomainEventHandler
  implements IEventHandler<UserRegisteredEvent>
{
  private readonly logger = new CorrelationLogger(
    UserRegisteredDomainEventHandler.name,
  );

  constructor(
    @Inject(INTEGRATION_EVENT_PUBLISHER_TOKEN)
    private readonly integrationEventPublisher: IntegrationEventPublisher,
  ) {}

  async handle(event: UserRegisteredEvent): Promise<void> {
    this.logger.log('Handling UserRegisteredEvent...');

    // Transform domain event to integration event
    const integrationEvent = new UserCreatedIntegrationEvent({
      userId: event.payload.userId,
      email: event.payload.email,
      username: event.payload.username,
      roles: event.payload.roles,
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