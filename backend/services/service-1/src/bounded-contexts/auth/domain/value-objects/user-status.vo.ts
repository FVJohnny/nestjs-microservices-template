import { EnumValueObject, DomainValidationException } from '@libs/nestjs-common';

export enum UserStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export class UserStatus extends EnumValueObject<UserStatusEnum> {
  constructor(value: UserStatusEnum) {
    super(value, Object.values(UserStatusEnum));
  }

  protected throwErrorForInvalidValue(value: UserStatusEnum): void {
    throw new DomainValidationException('userStatus', value, `Invalid user status: ${value}`);
  }

  static active(): UserStatus {
    return new UserStatus(UserStatusEnum.ACTIVE);
  }

  static inactive(): UserStatus {
    return new UserStatus(UserStatusEnum.INACTIVE);
  }

  static suspended(): UserStatus {
    return new UserStatus(UserStatusEnum.SUSPENDED);
  }

  static deleted(): UserStatus {
    return new UserStatus(UserStatusEnum.DELETED);
  }
}
