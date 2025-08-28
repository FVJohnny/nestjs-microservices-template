import { v4 as uuidv4 } from 'uuid';
import { AggregateRoot, Primitives } from '@libs/nestjs-common';
import { UserRegisteredEvent } from '../events/user-registered.event';
import { UserProfileUpdatedEvent } from '../events/user-profile-updated.event';
import { UserStatus, UserStatusEnum } from '../value-objects/user-status.vo';
import { UserRole, UserRoleEnum } from '../value-objects/user-role.vo';
import { Email } from '../value-objects/email.vo';
import { Username } from '../value-objects/username.vo';
import { Name } from '../value-objects/name.vo';
import { Profile } from '../value-objects/profile.vo';

interface CreateUserProps {
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  roles?: UserRoleEnum[];
}

export class User extends AggregateRoot {
  constructor(
    public readonly id: string,
    public readonly email: Email,
    public readonly username: Username,
    public profile: Profile,
    public status: UserStatus,
    public roles: UserRole[],
    public lastLoginAt: Date | undefined,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {
    super();
  }

  static create(props: CreateUserProps): User {
    const id = uuidv4();
    const now = new Date();
    
    const user = new User(
      id,
      new Email(props.email),
      new Username(props.username),
      new Profile(
        new Name(props.firstName || ''),
        new Name(props.lastName || '')
      ),
      new UserStatus(UserStatusEnum.ACTIVE),
      props.roles ? props.roles.map(r => new UserRole(r)) : [new UserRole(UserRoleEnum.USER)],
      undefined,
      now,
      now,
    );

    user.apply(
      new UserRegisteredEvent({
        userId: id,
        email: props.email,
        username: props.username,
        roles: user.roles.map(r => r.toValue()),
        occurredOn: now,
      }),
    );

    return user;
  }

  static random(props?: Partial<CreateUserProps> & { 
    id?: string; 
    status?: UserStatusEnum; 
    lastLoginAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }): User {
    const id = props?.id || uuidv4();
    const now = new Date();
    
    return new User(
      id,
      new Email(props?.email || 'user@example.com'),
      new Username(props?.username || 'user' + Math.floor(Math.random() * 10000)),
      new Profile(
        new Name(props?.firstName || 'John'),
        new Name(props?.lastName || 'Doe')
      ),
      props?.status ? new UserStatus(props.status) : new UserStatus(UserStatusEnum.ACTIVE),
      props?.roles ? props.roles.map(r => new UserRole(r)) : [new UserRole(UserRoleEnum.USER)],
      props?.lastLoginAt,
      props?.createdAt || now,
      props?.updatedAt || now,
    );
  }

  updateProfile(props: {
    firstName?: string;
    lastName?: string;
  }): void {
    const previousProfile = this.profile.toPrimitives();
    
    this.profile = new Profile(
      new Name(props.firstName || this.profile.firstName.toValue()),
      new Name(props.lastName || this.profile.lastName.toValue())
    );
    this.updatedAt = new Date();

    const newProfile = this.profile.toPrimitives();
    
    this.apply(
      new UserProfileUpdatedEvent({
        userId: this.id,
        previousFirstName: previousProfile.firstName,
        previousLastName: previousProfile.lastName,
        firstName: newProfile.firstName,
        lastName: newProfile.lastName,
        occurredOn: this.updatedAt,
      }),
    );
  }

  activate(): void {
    if (this.status.equals(new UserStatus(UserStatusEnum.ACTIVE))) {
      return;
    }
    this.status = new UserStatus(UserStatusEnum.ACTIVE);
    this.updatedAt = new Date();
  }

  deactivate(): void {
    if (this.status.equals(new UserStatus(UserStatusEnum.INACTIVE))) {
      return;
    }
    this.status = new UserStatus(UserStatusEnum.INACTIVE);
    this.updatedAt = new Date();
  }

  hasRole(role: UserRole): boolean {
    return this.roles.some(r => r.equals(role));
  }

  addRole(role: UserRole): void {
    if (!this.hasRole(role)) {
      this.roles.push(role);
      this.updatedAt = new Date();
    }
  }

  removeRole(role: UserRole): void {
    const index = this.roles.findIndex(r => r.equals(role));
    if (index > -1) {
      this.roles.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  isActive(): boolean {
    return this.status.equals(new UserStatus(UserStatusEnum.ACTIVE));
  }

  static fromPrimitives(primitives: Primitives): User {
    return new User(
      primitives.id,
      new Email(primitives.email),
      new Username(primitives.username),
      Profile.fromPrimitives({ firstName: primitives.firstName, lastName: primitives.lastName }),
      new UserStatus(primitives.status),
      primitives.roles.map((r: UserRoleEnum) => new UserRole(r)),
      primitives.lastLoginAt ? new Date(primitives.lastLoginAt) : undefined,
      new Date(primitives.createdAt),
      new Date(primitives.updatedAt),
    );
  }

  toPrimitives(): Primitives {
    const profileData = this.profile.toPrimitives();
    return {
      id: this.id,
      email: this.email.toValue(),
      username: this.username.toValue(),
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      status: this.status.toValue(),
      roles: this.roles.map(r => r.toValue()),
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}