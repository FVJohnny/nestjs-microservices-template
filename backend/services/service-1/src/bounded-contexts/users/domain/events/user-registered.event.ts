import { DomainEvent } from '@libs/nestjs-common';
import { UserRoleEnum } from '../value-objects/user-role.vo';

export class UserRegisteredEvent extends DomainEvent {
  constructor(
    public readonly payload: {
      userId: string;
      email: string;
      username: string;
      roles: UserRoleEnum[];
      occurredOn: Date;
    },
  ) {
    super(payload.userId);
  }

  protected getPayload(): Record<string, any> {
    return this.payload;
  }
}