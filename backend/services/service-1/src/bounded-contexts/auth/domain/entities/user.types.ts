import type { Email } from '../value-objects/email.vo';
import type { Username } from '../value-objects/username.vo';
import type { UserRole } from '../value-objects/user-role.vo';
import type { UserStatus } from '../value-objects/user-status.vo';
import type { Password } from '../value-objects/password.vo';
import { SharedAggregateRootDTO } from '@libs/nestjs-common';

export interface CreateUserProps {
  email: Email;
  username: Username;
  password: Password;
  role: UserRole;
}
export interface UserAttributes {
  id: string;
  email: Email;
  username: Username;
  password: Password;
  status: UserStatus;
  role: UserRole;
  lastLoginAt: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export class UserDTO extends SharedAggregateRootDTO {
  id: string;
  email: string;
  username: string;
  password: string;
  status: string;
  role: string;
  lastLoginAt: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}
