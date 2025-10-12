import { Base_DomainEvent } from '@libs/nestjs-common';
import type { UserRole, Email, Username } from '@bc/auth/domain/value-objects';
import type { Id } from '@libs/nestjs-common';

export class UserRegistered_DomainEvent extends Base_DomainEvent {
  constructor(
    public readonly userId: Id,
    public readonly email: Email,
    public readonly username: Username,
    public readonly role: UserRole,
  ) {
    super(userId);
  }
}
