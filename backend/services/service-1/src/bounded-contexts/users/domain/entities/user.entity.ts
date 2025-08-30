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
  email: Email;
  username: Username;
  firstName: Name;
  lastName: Name;
  roles: UserRole[];
}
interface UserConstructorProps {
  id: string;
  email: Email;
  username: Username;
  profile: Profile;
  status: UserStatus;
  roles: UserRole[];
  lastLoginAt: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
};

export class User extends AggregateRoot {
  public readonly id: string;
  public readonly email: Email;
  public readonly username: Username;
  public profile: Profile;
  public status: UserStatus;
  public roles: UserRole[];
  public lastLoginAt: Date | undefined;
  public readonly createdAt: Date;
  public updatedAt: Date

  constructor(
    props: UserConstructorProps
  ) {
    super();
    this.id = props.id;
    this.email = props.email;
    this.username = props.username;
    this.profile = props.profile;
    this.status = props.status;
    this.roles = props.roles;
    this.lastLoginAt = props.lastLoginAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CreateUserProps): User {
    const id = uuidv4();
    const now = new Date();
    
    const user = new User({ 
      id,
      email: props.email,
      username: props.username,
      profile: new Profile(
        props.firstName,
        props.lastName
      ),
      status: new UserStatus(UserStatusEnum.ACTIVE),
      roles: props.roles,
      lastLoginAt: undefined,
      createdAt: now,
      updatedAt: now,
    });

    user.apply(
      new UserRegisteredEvent({
        userId: id,
        email: props.email,
        username: props.username,
        roles: user.roles,
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
    
    return new User({
      id,
      email: props?.email || new Email('user@example.com'),
      username: props?.username || new Username('user' + Math.floor(Math.random() * 10000)),
      profile: new Profile(
        props?.firstName ?? new Name('John'),
        props?.lastName ?? new Name('Doe')
      ),
      status: new UserStatus(props?.status || UserStatusEnum.ACTIVE),
      roles: props?.roles ?? [new UserRole(UserRoleEnum.USER)],
      lastLoginAt: props?.lastLoginAt,
      createdAt: props?.createdAt || now,
      updatedAt: props?.updatedAt || now,
    });
  }

  updateProfile(props: {
    firstName: Name;
    lastName: Name;
  }): void {
    const previousProfile = this.profile.toPrimitives();
    
    this.profile = new Profile(
      props.firstName,
      props.lastName
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
      this.roles = this.roles.filter(r => !r.equals(role));
      this.updatedAt = new Date();
  }

  isActive(): boolean {
    return this.status.equals(new UserStatus(UserStatusEnum.ACTIVE));
  }

  static fromPrimitives(primitives: Primitives): User {
    return new User({
      id: primitives.id,
      email: new Email(primitives.email),
      username: new Username(primitives.username),
      profile: Profile.fromPrimitives({ firstName: primitives.firstName, lastName: primitives.lastName }),
      status: new UserStatus(primitives.status),
      roles: primitives.roles.map((r: UserRoleEnum) => new UserRole(r)),
      lastLoginAt: primitives.lastLoginAt ? new Date(primitives.lastLoginAt) : undefined,
      createdAt: new Date(primitives.createdAt),
      updatedAt: new Date(primitives.updatedAt),
    });
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