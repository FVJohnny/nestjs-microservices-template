import { DomainEvent } from '@libs/nestjs-common';
import { UserRole, UserRoleEnum } from '../value-objects/user-role.vo';
import { Email } from '../value-objects/email.vo';
import { Username } from '../value-objects/username.vo';

interface UserRegisteredEventPayload {
  userId: string;
  email: Email;
  username: Username;
  roles: UserRole[];
  occurredOn: Date;
}

export class UserRegisteredEvent extends DomainEvent {

  public readonly email: Email;
  public readonly username: Username;
  public readonly roles: UserRole[];

  constructor(
    payload: UserRegisteredEventPayload,
  ) {
    super(payload.userId);

    this.email = payload.email;
    this.username = payload.username;
    this.roles = payload.roles;
  }

}