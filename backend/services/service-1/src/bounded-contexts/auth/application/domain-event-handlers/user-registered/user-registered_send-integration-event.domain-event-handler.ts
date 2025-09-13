import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserRegisteredDomainEvent } from '../../../domain/events/user-registered.domain-event';
import { UserCreatedIntegrationEvent, OutboxService } from '@libs/nestjs-common';

@EventsHandler(UserRegisteredDomainEvent)
export class UserRegistered_SendIntegrationEvent_DomainEventHandler
  implements IEventHandler<UserRegisteredDomainEvent>
{
  constructor(private readonly outboxService: OutboxService) {}

  async handle(event: UserRegisteredDomainEvent): Promise<void> {
    const integrationEvent = new UserCreatedIntegrationEvent(
      {
        userId: event.aggregateId.toValue(),
        email: event.email.toValue(),
        username: event.username.toValue(),
        role: event.role.toValue(),
      },
      { causationId: event.metadata.id },
    );

    await this.outboxService.storeEvent(
      integrationEvent.name,
      integrationEvent.getTopic(),
      integrationEvent.toJSONString(),
    );
  }
}
