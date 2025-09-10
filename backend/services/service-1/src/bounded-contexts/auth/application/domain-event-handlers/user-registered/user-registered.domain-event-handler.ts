import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { UserRegisteredDomainEvent } from '../../../domain/events/user-registered.domain-event';
import { UserCreatedIntegrationEvent, OutboxService, TracingLogger } from '@libs/nestjs-common';
import { CreateEmailVerificationCommand } from '../../commands/create-email-verification/create-email-verification.command';

@EventsHandler(UserRegisteredDomainEvent)
export class UserRegisteredDomainEventHandler implements IEventHandler<UserRegisteredDomainEvent> {
  private readonly logger = new TracingLogger(UserRegisteredDomainEventHandler.name);

  constructor(
    private readonly outboxService: OutboxService,
    private readonly commandBus: CommandBus,
  ) {}

  async handle(event: UserRegisteredDomainEvent): Promise<void> {
    this.logger.log('Handling UserRegisteredEvent...');

    await this.createEmailVerification(event);
    await this.publishUserCreatedIntegrationEvent(event);
  }

  private async createEmailVerification(event: UserRegisteredDomainEvent): Promise<void> {
    const createEmailVerificationCommand = new CreateEmailVerificationCommand({
      userId: event.aggregateId,
      email: event.email.toValue(),
    });

    await this.commandBus.execute(createEmailVerificationCommand);
  }

  private async publishUserCreatedIntegrationEvent(
    event: UserRegisteredDomainEvent,
  ): Promise<void> {
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
