import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { UserRegisteredDomainEvent } from '@bc/auth/domain/events/user-registered.domain-event';
import { CreateEmailVerificationCommand } from '@bc/auth/application/commands/create-email-verification/create-email-verification.command';

@EventsHandler(UserRegisteredDomainEvent)
export class UserRegistered_CreateEmailVerification_DomainEventHandler
  implements IEventHandler<UserRegisteredDomainEvent>
{
  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: UserRegisteredDomainEvent): Promise<void> {
    const createEmailVerificationCommand = new CreateEmailVerificationCommand({
      userId: event.aggregateId.toValue(),
      email: event.email.toValue(),
    });

    await this.commandBus.execute(createEmailVerificationCommand);
  }
}
