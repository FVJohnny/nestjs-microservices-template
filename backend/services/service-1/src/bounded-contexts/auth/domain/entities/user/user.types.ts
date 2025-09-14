import { Id, Timestamps } from '@libs/nestjs-common';
import { Email, Username, UserRole, UserStatus, Password, LastLogin } from '@bc/auth/domain/value-objects';
import { SharedAggregateRootDTO } from '@libs/nestjs-common';

export interface CreateUserProps {
  email: Email;
  username: Username;
  password: Password;
  role: UserRole;
}
export interface UserAttributes {
  id: Id;
  email: Email;
  username: Username;
  password: Password;
  status: UserStatus;
  role: UserRole;
  lastLogin: LastLogin;
  timestamps: Timestamps;
}

export class UserDTO extends SharedAggregateRootDTO {
  id: string;
  email: string;
  username: string;
  password: string;
  status: string;
  role: string;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;

  static random(): UserDTO {
    return {
      id: Id.random().toValue(),
      email: Email.random().toValue(),
      username: Username.random().toValue(),
      password: Password.random().toValue(),
      status: UserStatus.random().toValue(),
      role: UserRole.random().toValue(),
      lastLogin: LastLogin.random().toValue(),
      createdAt: Timestamps.random().createdAt.toValue(),
      updatedAt: Timestamps.random().updatedAt.toValue(),
    };
  }
}
