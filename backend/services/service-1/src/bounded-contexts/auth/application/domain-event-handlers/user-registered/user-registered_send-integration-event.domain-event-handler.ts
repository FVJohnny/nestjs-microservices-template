import { EventsHandler } from '@nestjs/cqrs';
import { UserRegistered_DomainEvent } from '@bc/auth/domain/events/user-registered.domain-event';
import { UserCreated_IntegrationEvent, OutboxService } from '@libs/nestjs-common';
import { DomainEventHandlerBase } from '@libs/nestjs-common';

@EventsHandler(UserRegistered_DomainEvent)
export class UserRegistered_SendIntegrationEvent_DomainEventHandler extends DomainEventHandlerBase<UserRegistered_DomainEvent> {
  constructor(private readonly outboxService: OutboxService) {
    super();
  }

  async handleEvent(event: UserRegistered_DomainEvent) {
    const integrationEvent = new UserCreated_IntegrationEvent({
      userId: event.aggregateId.toValue(),
      email: event.email.toValue(),
      username: event.username.toValue(),
      role: event.role.toValue(),
    });

    await this.outboxService.storeEvent(
      UserCreated_IntegrationEvent.name,
      UserCreated_IntegrationEvent.topic,
      integrationEvent.toJSONString(),
    );
  }
}
