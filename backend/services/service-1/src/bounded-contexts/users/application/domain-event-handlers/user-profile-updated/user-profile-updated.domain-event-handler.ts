import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserProfileUpdatedDomainEvent } from '../../../domain/events/user-profile-updated.domain-event';

@EventsHandler(UserProfileUpdatedDomainEvent)
export class UserProfileUpdatedDomainEventHandler
  implements IEventHandler<UserProfileUpdatedDomainEvent>
{
  private readonly logger = new Logger(
    UserProfileUpdatedDomainEventHandler.name,
  );

  handle(event: UserProfileUpdatedDomainEvent): Promise<void> {
    this.logger.log(`User profile updated for user: ${event.aggregateId}`);

    return Promise.resolve();
    // Here you could add additional logic like:
    // - Update search indices
    // - Send notification emails
    // - Update cache
    // - Trigger other workflows
  }
}
