import { ValueObject } from '@libs/nestjs-common';

export enum UserStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export class UserStatus extends ValueObject<UserStatusEnum> {
  static readonly ACTIVE = new UserStatus(UserStatusEnum.ACTIVE);
  static readonly INACTIVE = new UserStatus(UserStatusEnum.INACTIVE);
  static readonly SUSPENDED = new UserStatus(UserStatusEnum.SUSPENDED);
  static readonly DELETED = new UserStatus(UserStatusEnum.DELETED);

  static fromString(status: string): UserStatus {
    const validStatuses = Object.values(UserStatusEnum);
    if (!validStatuses.includes(status as UserStatusEnum)) {
      throw new Error(`Invalid user status: ${status}`);
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