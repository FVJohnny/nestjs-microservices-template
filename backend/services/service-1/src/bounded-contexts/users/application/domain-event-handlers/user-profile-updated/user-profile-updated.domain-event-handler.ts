import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserProfileUpdatedEvent } from '../../../domain/events/user-profile-updated.event';

@EventsHandler(UserProfileUpdatedEvent)
export class UserProfileUpdatedDomainEventHandler
  implements IEventHandler<UserProfileUpdatedEvent>
{
  private readonly logger = new Logger(UserProfileUpdatedDomainEventHandler.name);

  async handle(event: UserProfileUpdatedEvent): Promise<void> {
    this.logger.log(`User profile updated for user: ${event.aggregateId}`);
    
    // Here you could add additional logic like:
    // - Update search indices
    // - Send notification emails
    // - Update cache
    // - Trigger other workflows
  }
}