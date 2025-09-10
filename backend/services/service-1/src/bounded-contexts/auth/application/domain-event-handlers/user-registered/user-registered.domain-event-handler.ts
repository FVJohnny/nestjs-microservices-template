import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserRegisteredDomainEvent } from '../../../domain/events/user-registered.domain-event';
import { UserCreatedIntegrationEvent, OutboxService, TracingLogger } from '@libs/nestjs-common';

@EventsHandler(UserRegisteredDomainEvent)
export class UserRegisteredDomainEventHandler implements IEventHandler<UserRegisteredDomainEvent> {
  private readonly logger = new TracingLogger(UserRegisteredDomainEventHandler.name);

  constructor(private readonly outboxService: OutboxService) {}

  async handle(event: UserRegisteredDomainEvent): Promise<void> {
    this.logger.log('Handling UserRegisteredEvent...');

    const integrationEvent = new UserCreatedIntegrationEvent(
      {
        userId: event.aggregateId,
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
