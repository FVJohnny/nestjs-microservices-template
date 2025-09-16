import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { UserRegistered_DomainEvent } from '@bc/auth/domain/events/user-registered.domain-event';
import { CreateEmailVerification_Command } from '@bc/auth/application/commands/create-email-verification/create-email-verification.command';

@EventsHandler(UserRegistered_DomainEvent)
export class UserRegistered_CreateEmailVerification_DomainEventHandler
  implements IEventHandler<UserRegistered_DomainEvent>
{
  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: UserRegistered_DomainEvent): Promise<void> {
    const createEmailVerificationCommand = new CreateEmailVerification_Command({
      userId: event.aggregateId.toValue(),
      email: event.email.toValue(),
    });

    await this.commandBus.execute(createEmailVerificationCommand);
  }
}
