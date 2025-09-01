import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UserRegisteredDomainEvent } from '../../../domain/events/user-registered.domain-event';
import {
  UserCreatedIntegrationEvent,
  type IntegrationEventPublisher,
  TracingLogger,
  INTEGRATION_EVENT_PUBLISHER_TOKEN,
} from '@libs/nestjs-common';

@EventsHandler(UserRegisteredDomainEvent)
export class UserRegisteredDomainEventHandler
  implements IEventHandler<UserRegisteredDomainEvent>
{
  private readonly logger = new TracingLogger(
    UserRegisteredDomainEventHandler.name,
  );

  constructor(
    @Inject(INTEGRATION_EVENT_PUBLISHER_TOKEN)
    private readonly integrationEventPublisher: IntegrationEventPublisher,
  ) {}

  async handle(event: UserRegisteredDomainEvent): Promise<void> {
    this.logger.log('Handling UserRegisteredEvent...');

    const integrationEvent = new UserCreatedIntegrationEvent({
      userId: event.aggregateId,
      email: event.email.toValue(),
      username: event.username.toValue(),
      role: event.role.toValue(),
    }, {causationId: event.metadata.id});

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