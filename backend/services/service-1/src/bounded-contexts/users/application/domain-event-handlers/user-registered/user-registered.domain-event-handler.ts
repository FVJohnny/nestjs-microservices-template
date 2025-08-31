import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UserRegisteredEvent } from '../../../domain/events/user-registered.event';
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
      userId: event.userId,
      email: event.email.toValue(),
      username: event.username.toValue(),
      roles: event.roles.map(role => role.toValue()),
    });

    try {
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