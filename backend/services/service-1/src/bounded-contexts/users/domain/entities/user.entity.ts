import { v4 as uuidv4 } from 'uuid';
import { AggregateRoot, Primitives } from '@libs/nestjs-common';
import { UserRegisteredEvent } from '../events/user-registered.event';
import { UserProfileUpdatedEvent } from '../events/user-profile-updated.event';
import { UserStatus, UserStatusEnum } from '../value-objects/user-status.vo';
import { UserRole, UserRoleEnum } from '../value-objects/user-role.vo';
import { Email } from '../value-objects/email.vo';

interface CreateUserProps {
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  roles?: UserRoleEnum[];
  metadata?: Record<string, any>;
}

export class User extends AggregateRoot {
  constructor(
    public readonly id: string,
    public readonly email: Email,
    public readonly username: string,
    public firstName: string | undefined,
    public lastName: string | undefined,
    public status: UserStatus,
    public roles: UserRole[],
    public metadata: Record<string, any> | undefined,
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
      Email.fromString(props.email),
      props.username,
      props.firstName,
      props.lastName,
      UserStatus.ACTIVE,
      props.roles ? props.roles.map(r => UserRole.fromString(r)) : [UserRole.USER],
      props.metadata,
      undefined,
      now,
      now,
    );

    user.apply(
      new UserRegisteredEvent({
        userId: id,
        email: props.email,
        username: props.username,
        roles: user.roles.map(r => r.value),
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
      Email.fromString(props?.email || 'user@example.com'),
      props?.username || 'user' + Math.floor(Math.random() * 10000),
      props?.firstName || 'John',
      props?.lastName || 'Doe',
      props?.status ? UserStatus.fromString(props.status) : UserStatus.ACTIVE,
      props?.roles ? props.roles.map(r => UserRole.fromString(r)) : [UserRole.USER],
      props?.metadata || {},
      props?.lastLoginAt,
      props?.createdAt || now,
      props?.updatedAt || now,
    );
  }

  getFullName(): string {
    const parts: string[] = [];
    if (this.firstName) parts.push(this.firstName);
    if (this.lastName) parts.push(this.lastName);
    return parts.join(' ') || this.username;
  }

  updateProfile(props: {
    firstName?: string;
    lastName?: string;
    metadata?: Record<string, any>;
  }): void {
    const previousFirstName = this.firstName;
    const previousLastName = this.lastName;

    if (props.firstName !== undefined) {
      this.firstName = props.firstName;
    }
    if (props.lastName !== undefined) {
      this.lastName = props.lastName;
    }
    if (props.metadata !== undefined) {
      this.metadata = { ...this.metadata, ...props.metadata };
    }

    this.updatedAt = new Date();

    this.apply(
      new UserProfileUpdatedEvent({
        userId: this.id,
        previousFirstName,
        previousLastName,
        firstName: this.firstName,
        lastName: this.lastName,
        metadata: this.metadata,
        occurredOn: this.updatedAt,
      }),
    );
  }

  activate(): void {
    if (this.status.equals(UserStatus.ACTIVE)) {
      return;
    }
    this.status = UserStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  suspend(): void {
    if (this.status.equals(UserStatus.SUSPENDED)) {
      return;
    }
    this.status = UserStatus.SUSPENDED;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    if (this.status.equals(UserStatus.INACTIVE)) {
      return;
    }
    this.status = UserStatus.INACTIVE;
    this.updatedAt = new Date();
  }

  delete(): void {
    if (this.status.equals(UserStatus.DELETED)) {
      return;
    }
    this.status = UserStatus.DELETED;
    this.updatedAt = new Date();
  }

  updateLastLogin(): void {
    this.lastLoginAt = new Date();
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
    return this.status.isActive();
  }

  static fromPrimitives(primitives: Primitives): User {
    return new User(
      primitives.id,
      Email.fromString(primitives.email),
      primitives.username,
      primitives.firstName,
      primitives.lastName,
      UserStatus.fromString(primitives.status),
      primitives.roles.map((r: string) => UserRole.fromString(r)),
      primitives.metadata,
      primitives.lastLoginAt ? new Date(primitives.lastLoginAt) : undefined,
      new Date(primitives.createdAt),
      new Date(primitives.updatedAt),
    );
  }

  toPrimitives(): Primitives {
    return {
      id: this.id,
      email: this.email.value,
      username: this.username,
      firstName: this.firstName,
      lastName: this.lastName,
      status: this.status.value,
      roles: this.roles.map(r => r.value),
      metadata: this.metadata,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}