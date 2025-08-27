export * from './user-registered.domain-event-handler';
export * from './user-profile-updated.domain-event-handler';

// Auto-export handlers array for easy module registration
import { UserRegisteredDomainEventHandler } from './user-registered.domain-event-handler';
import { UserProfileUpdatedDomainEventHandler } from './user-profile-updated.domain-event-handler';

export const DOMAIN_EVENT_HANDLERS = [
  UserRegisteredDomainEventHandler,
  UserProfileUpdatedDomainEventHandler,
];