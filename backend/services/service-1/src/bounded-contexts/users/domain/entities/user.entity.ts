import { v4 as uuidv4 } from 'uuid';
import { UserRegisteredDomainEvent } from '../events/user-registered.domain-event';
import { UserProfileUpdatedDomainEvent } from '../events/user-profile-updated.domain-event';
import { UserStatus, UserStatusEnum } from '../value-objects/user-status.vo';
import type { UserRoleEnum } from '../value-objects/user-role.vo';
import { UserRole } from '../value-objects/user-role.vo';
import { Email } from '../value-objects/email.vo';
import { Username } from '../value-objects/username.vo';
import { Name } from '../value-objects/name.vo';
import { UserProfile } from '../value-objects/user-profile.vo';
import type { CreateUserProps, UserAttributes, UserDTO } from './user.types';
import { SharedAggregateRoot } from '@libs/nestjs-common';

export class User extends SharedAggregateRoot implements UserAttributes {
  id: string;
  email: Email;
  username: Username;
  profile: UserProfile;
  status: UserStatus;
  role: UserRole;
  lastLoginAt: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
  constructor(props: UserAttributes) {
    super();
    Object.assign(this, props);
  }

  static create(props: CreateUserProps): User {
    const id = uuidv4();
    const now = new Date();

    const user = new User({
      id,
      email: props.email,
      username: props.username,
      profile: new UserProfile(props.firstName, props.lastName),
      status: new UserStatus(UserStatusEnum.ACTIVE),
      role: props.role,
      lastLoginAt: undefined,
      createdAt: now,
      updatedAt: now,
    });

    user.apply(
      new UserRegisteredDomainEvent({
        userId: id,
        email: props.email,
        username: props.username,
        role: user.role,
      }),
    );

    return user;
  }

  static random(props?: Partial<UserAttributes>): User {
    const id = props?.id || uuidv4();
    const now = new Date();

    return new User({
      id,
      email: props?.email || new Email('user@example.com'),
      username:
        props?.username ||
        new Username('user' + Math.floor(Math.random() * 10000)),
      profile:
        props?.profile ?? new UserProfile(new Name('John'), new Name('Doe')),
      status: props?.status ?? new UserStatus(UserStatusEnum.ACTIVE),
      role: props?.role ?? UserRole.random(),
      lastLoginAt: props?.lastLoginAt,
      createdAt: props?.createdAt || now,
      updatedAt: props?.updatedAt || now,
    });
  }

  updateProfile(props: { firstName: Name; lastName: Name }): void {
    const previousProfile = this.profile.toValue();

    this.profile = new UserProfile(props.firstName, props.lastName);
    this.updatedAt = new Date();

    const newProfile = this.profile.toValue();

    this.apply(
      new UserProfileUpdatedDomainEvent({
        userId: this.id,
        previousFirstName: previousProfile.firstName,
        previousLastName: previousProfile.lastName,
        firstName: newProfile.firstName,
        lastName: newProfile.lastName,
      }),
    );
  }

  activate(): void {
    if (this.status.equals(UserStatus.active())) {
      return;
    }
    this.status = UserStatus.active();
    this.updatedAt = new Date();
  }

  deactivate(): void {
    if (this.status.equals(UserStatus.inactive())) {
      return;
    }
    this.status = UserStatus.inactive();
    this.updatedAt = new Date();
  }

  hasRole(role: UserRole): boolean {
    return this.role.equals(role);
  }

  changeRole(role: UserRole): void {
    if (!this.hasRole(role)) {
      this.role = role;
      this.updatedAt = new Date();
    }
  }

  isActive(): boolean {
    return this.status.equals(UserStatus.active());
  }

  static fromValue(value: UserDTO): User {
    return new User({
      id: value.id,
      email: new Email(value.email),
      username: new Username(value.username),
      profile: new UserProfile(
        new Name(value.profile.firstName),
        new Name(value.profile.lastName),
      ),
      status: new UserStatus(value.status as UserStatusEnum),
      role: new UserRole(value.role as UserRoleEnum),
      lastLoginAt: value.lastLoginAt ? new Date(value.lastLoginAt) : undefined,
      createdAt: new Date(value.createdAt),
      updatedAt: new Date(value.updatedAt),
    });
  }

  toValue(): UserDTO {
    return {
      id: this.id,
      email: this.email.toValue(),
      username: this.username.toValue(),
      profile: this.profile.toValue(),
      status: this.status.toValue(),
      role: this.role.toValue(),
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
