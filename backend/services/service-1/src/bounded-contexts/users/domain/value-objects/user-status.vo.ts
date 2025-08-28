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
}