import { DomainEvent } from '@libs/nestjs-common';
import { UserRole, UserRoleEnum } from '../value-objects/user-role.vo';
import { Email } from '../value-objects/email.vo';
import { Username } from '../value-objects/username.vo';
import { User } from '../entities/user.entity';

export class UserRegisteredEvent extends DomainEvent {
  constructor(
    public readonly payload: {
      userId: string;
      email: Email;
      username: Username;
      roles: UserRole[];
      occurredOn: Date;
    },
  ) {
    super(payload.userId);
  }

  protected getPayload(): Record<string, any> {
    return this.payload;
  }
}