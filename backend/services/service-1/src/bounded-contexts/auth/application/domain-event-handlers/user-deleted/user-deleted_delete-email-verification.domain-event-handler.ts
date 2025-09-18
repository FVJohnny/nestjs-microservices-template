import { EventsHandler, CommandBus } from '@nestjs/cqrs';
import { UserDeleted_DomainEvent } from '@bc/auth/domain/events/user-deleted.domain-event';
import { DeleteEmailVerificationByUserId_Command } from '@bc/auth/application/commands';
import { DomainEventHandlerBase, NotFoundException } from '@libs/nestjs-common';

@EventsHandler(UserDeleted_DomainEvent)
export class UserDeleted_DeleteEmailVerification_DomainEventHandler extends DomainEventHandlerBase<UserDeleted_DomainEvent> {
  constructor(private readonly commandBus: CommandBus) {
    super();
  }

  async handleEvent(event: UserDeleted_DomainEvent) {
    try {
      const command = new DeleteEmailVerificationByUserId_Command({
        userId: event.aggregateId.toValue(),
      });
      await this.commandBus.execute(command);
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.debug(
          `No email verification to delete for user ${event.aggregateId.toValue()}`,
        );
        return;
      }
      throw error;
    }
  }
}
