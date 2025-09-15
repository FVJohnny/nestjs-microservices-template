import { SharedAggregateRootDTO, Id, Timestamps } from '@libs/nestjs-common';
import { Email, Username, Password, UserStatus, UserRole, LastLogin } from '../../value-objects';

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
