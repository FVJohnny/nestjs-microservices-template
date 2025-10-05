import { SharedAggregateRootDTO } from '@libs/nestjs-common';
import { Email, Username, Password, UserStatus, UserRole, LastLogin } from '../../value-objects';

export class UserDTO extends SharedAggregateRootDTO {
  email: string;
  username: string;
  password: string;
  status: string;
  role: string;
  lastLogin: Date;

  static random(): UserDTO {
    return {
      ...super.random(),

      email: Email.random().toValue(),
      username: Username.random().toValue(),
      password: Password.random().toValue(),
      status: UserStatus.random().toValue(),
      role: UserRole.random().toValue(),
      lastLogin: LastLogin.random().toValue(),
    };
  }
}
