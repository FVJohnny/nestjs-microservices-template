import { EnumValueObject, DomainValidationException } from '@libs/nestjs-common';

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
    throw new DomainValidationException('userRole', value, `Invalid user role: ${value}`);
  }

  static admin(): UserRole {
    return new UserRole(UserRoleEnum.ADMIN);
  }

  static user(): UserRole {
    return new UserRole(UserRoleEnum.USER);
  }

  static moderator(): UserRole {
    return new UserRole(UserRoleEnum.MODERATOR);
  }
}

  