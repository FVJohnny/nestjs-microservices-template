import { type ICommandBus, EventsHandler } from '@nestjs/cqrs';
import { UserRegistered_DomainEvent } from '@bc/auth/domain/events/user-registered.domain-event';
import { CreateEmailVerification_Command } from '@bc/auth/application/commands/create-email-verification/create-email-verification.command';
import { COMMAND_BUS, DomainEventHandlerBase } from '@libs/nestjs-common';
import { Inject } from '@nestjs/common';

@EventsHandler(UserRegistered_DomainEvent)
export class UserRegistered_CreateEmailVerification_DomainEventHandler extends DomainEventHandlerBase<UserRegistered_DomainEvent> {
  constructor(@Inject(COMMAND_BUS) private readonly commandBus: ICommandBus) {
    super();
  }

  async handleEvent(event: UserRegistered_DomainEvent) {
    const createEmailVerificationCommand = new CreateEmailVerification_Command({
      userId: event.aggregateId.toValue(),
      email: event.email.toValue(),
    });

    await this.commandBus.execute(createEmailVerificationCommand);
  }
}
