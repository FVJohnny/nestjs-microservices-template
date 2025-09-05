import { Email } from '../value-objects/email.vo';
import { Username } from '../value-objects/username.vo';
import { Name } from '../value-objects/name.vo';
import { UserRole } from '../value-objects/user-role.vo';
import { UserStatus } from '../value-objects/user-status.vo';
import { UserProfile, UserProfileDTO } from '../value-objects/user-profile.vo';
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
