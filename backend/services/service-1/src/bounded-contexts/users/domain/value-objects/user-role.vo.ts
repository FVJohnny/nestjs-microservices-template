import { ValueObject } from '@libs/nestjs-common';

export enum UserRoleEnum {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}

export class UserRole extends ValueObject<UserRoleEnum> {
  static readonly ADMIN = new UserRole(UserRoleEnum.ADMIN);
  static readonly USER = new UserRole(UserRoleEnum.USER);
  static readonly MODERATOR = new UserRole(UserRoleEnum.MODERATOR);

  static fromString(role: string): UserRole {
    const validRoles = Object.values(UserRoleEnum);
    if (!validRoles.includes(role as UserRoleEnum)) {
      throw new Error(`Invalid user role: ${role}`);
    }
    return new UserRole(role as UserRoleEnum);
  }

  isAdmin(): boolean {
    return this.value === UserRoleEnum.ADMIN;
  }

  isUser(): boolean {
    return this.value === UserRoleEnum.USER;
  }

  isModerator(): boolean {
    return this.value === UserRoleEnum.MODERATOR;
  }

  hasElevatedPrivileges(): boolean {
    return this.value === UserRoleEnum.ADMIN || this.value === UserRoleEnum.MODERATOR;
  }
}