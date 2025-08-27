import { EnumValueObject, InvalidArgumentError } from '@libs/nestjs-common';

export enum UserRoleEnum {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}

export class UserRole extends EnumValueObject<UserRoleEnum> {
  constructor(value: UserRoleEnum) {
    super(value, Object.values(UserRoleEnum));
  }

  protected throwErrorForInvalidValue(value: UserRoleEnum): void {
    throw new InvalidArgumentError(`Invalid user role: ${value}`);
  }

}