import { DomainEvent } from '@libs/nestjs-common';
import type { UserRole, Email, Username } from '../value-objects';
import type { Id } from '@libs/nestjs-common';

export interface UserRegisteredDomainEventParams {
  userId: Id;
  email: Email;
  username: Username;
  role: UserRole;
}

export class UserRegisteredDomainEvent extends DomainEvent {
  public readonly email: Email;
  public readonly username: Username;
  public readonly role: UserRole;

  constructor(params: UserRegisteredDomainEventParams) {
    super(params.userId);

    this.email = params.email;
    this.username = params.username;
    this.role = params.role;
  }
}
