import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserRegistered_DomainEvent } from '@bc/auth/domain/events/user-registered.domain-event';
import {
  UserCreated_IntegrationEvent,
  OutboxService,
  CorrelationLogger,
} from '@libs/nestjs-common';

@EventsHandler(UserRegistered_DomainEvent)
export class UserRegistered_SendIntegrationEvent_DomainEventHandler
  implements IEventHandler<UserRegistered_DomainEvent>
{
  private readonly logger = new CorrelationLogger(
    UserRegistered_SendIntegrationEvent_DomainEventHandler.name,
  );
  constructor(private readonly outboxService: OutboxService) {}

  async handle(event: UserRegistered_DomainEvent): Promise<void> {
    this.logger.log(
      `Sending UserCreated integration event for user ${event.aggregateId.toValue()}`,
    );
    const integrationEvent = new UserCreated_IntegrationEvent(
      {
        userId: event.aggregateId.toValue(),
        email: event.email.toValue(),
        username: event.username.toValue(),
        role: event.role.toValue(),
      },
      event.metadata,
    );

    await this.outboxService.storeEvent(
      integrationEvent.name,
      integrationEvent.topic,
      integrationEvent.toJSONString(),
    );
  }
}
