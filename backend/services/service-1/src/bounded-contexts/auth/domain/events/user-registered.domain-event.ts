import { DomainEvent } from '@libs/nestjs-common';
import type { UserRole, Email, Username } from '@bc/auth/domain/value-objects';
import type { Id } from '@libs/nestjs-common';

export class UserRegisteredDomainEvent extends DomainEvent {
  constructor(
    public readonly userId: Id,
    public readonly email: Email,
    public readonly username: Username,
    public readonly role: UserRole,
  ) {
    super(userId);
  }
}
