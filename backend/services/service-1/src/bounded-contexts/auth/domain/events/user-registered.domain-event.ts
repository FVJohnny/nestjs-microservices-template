import { DomainEvent } from '@libs/nestjs-common';
import type { UserRole, Email, Username } from '../value-objects';

export interface UserRegisteredDomainEventParams {
  userId: string;
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
