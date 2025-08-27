import { EnumValueObject, InvalidArgumentError } from '@libs/nestjs-common';

export enum UserStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export class UserStatus extends EnumValueObject<UserStatusEnum> {
  static readonly ACTIVE = new UserStatus(UserStatusEnum.ACTIVE);
  static readonly INACTIVE = new UserStatus(UserStatusEnum.INACTIVE);

  constructor(value: UserStatusEnum) {
    super(value, Object.values(UserStatusEnum));
  }

  protected throwErrorForInvalidValue(value: UserStatusEnum): void {
    throw new InvalidArgumentError(`Invalid user status: ${value}`);
  }

  static fromString(status: string): UserStatus {
    const validStatuses = Object.values(UserStatusEnum);
    if (!validStatuses.includes(status as UserStatusEnum)) {
      throw new InvalidArgumentError(`Invalid user status: ${status}`);
    }
    return new UserStatus(status as UserStatusEnum);
  }

  isActive(): boolean {
    return this.value === UserStatusEnum.ACTIVE;
  }

  isInactive(): boolean {
    return this.value === UserStatusEnum.INACTIVE;
  }

  isSuspended(): boolean {
    return this.value === UserStatusEnum.SUSPENDED;
  }

  isDeleted(): boolean {
    return this.value === UserStatusEnum.DELETED;
  }
}