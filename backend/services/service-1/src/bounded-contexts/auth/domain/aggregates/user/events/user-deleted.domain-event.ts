import { DomainEvent } from '@libs/nestjs-common';
import type { Id } from '@libs/nestjs-common';

export class UserDeleted_DomainEvent extends DomainEvent {
  constructor(userId: Id) {
    super(userId);
  }
}
