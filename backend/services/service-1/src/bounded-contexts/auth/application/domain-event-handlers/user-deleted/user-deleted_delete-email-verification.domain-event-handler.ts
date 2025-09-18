import { EventsHandler, type ICommandBus } from '@nestjs/cqrs';
import { UserDeleted_DomainEvent } from '@bc/auth/domain/events/user-deleted.domain-event';
import { DeleteEmailVerificationByUserId_Command } from '@bc/auth/application/commands';
import { COMMAND_BUS, DomainEventHandlerBase } from '@libs/nestjs-common';
import { Inject } from '@nestjs/common';

@EventsHandler(UserDeleted_DomainEvent)
export class UserDeleted_DeleteEmailVerification_DomainEventHandler extends DomainEventHandlerBase<UserDeleted_DomainEvent> {
  constructor(@Inject(COMMAND_BUS) private readonly commandBus: ICommandBus) {
    super();
  }

  async handleEvent(event: UserDeleted_DomainEvent) {
    const command = new DeleteEmailVerificationByUserId_Command({
      userId: event.aggregateId.toValue(),
    });
    await this.commandBus.execute(command);
  }
}
