import type { Id, TimestampsVO } from '@libs/nestjs-common';
import type { Email, Username, UserRole, UserStatus, Password } from '../../value-objects';
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
  lastLoginAt: Date | undefined;
  timestamps: TimestampsVO;
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
