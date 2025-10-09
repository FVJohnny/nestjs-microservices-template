import type { Id } from '@libs/nestjs-common';
import { DomainEvent } from '@libs/nestjs-common';

export class UserLogout_DomainEvent extends DomainEvent {
  constructor(aggregateId: Id) {
    super(aggregateId);
  }
}
