import { type ICommandBus } from '@nestjs/cqrs';
import { UserDeleted_DomainEvent } from '@bc/auth/domain/events/user-deleted.domain-event';
import { DeleteEmailVerificationByUserId_Command } from '@bc/auth/application/commands';
import { COMMAND_BUS, BaseDomainEventHandler } from '@libs/nestjs-common';
import { Inject } from '@nestjs/common';

export class UserDeleted_DeleteEmailVerification_DomainEventHandler extends BaseDomainEventHandler(
  UserDeleted_DomainEvent,
) {
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
