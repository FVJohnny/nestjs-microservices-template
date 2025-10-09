import type { Id } from '@libs/nestjs-common';
import { DomainEvent } from '@libs/nestjs-common';
import type { Email } from '@bc/auth/domain/value-objects';

export class UserPasswordChanged_DomainEvent extends DomainEvent {
  constructor(
    aggregateId: Id,
    public readonly email: Email,
  ) {
    super(aggregateId);
  }
}
