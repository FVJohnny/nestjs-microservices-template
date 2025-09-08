import type { Email } from '../value-objects/email.vo';
import type { Username } from '../value-objects/username.vo';
import type { Name } from '../value-objects/name.vo';
import type { UserRole } from '../value-objects/user-role.vo';
import type { UserStatus } from '../value-objects/user-status.vo';
import type {
  UserProfile,
  UserProfileDTO,
} from '../value-objects/user-profile.vo';
import { SharedAggregateRootDTO } from '@libs/nestjs-common';

export interface CreateUserProps {
  email: Email;
  username: Username;
  firstName: Name;
  lastName: Name;
  role: UserRole;
}
export interface UserAttributes {
  id: string;
  email: Email;
  username: Username;
  profile: UserProfile;
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
  profile: UserProfileDTO;
  status: string;
  role: string;
  lastLoginAt: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}
