import { v4 as uuidv4 } from 'uuid';
import { UserRegisteredDomainEvent } from '../../events/user-registered.domain-event';
import { UserStatus, UserStatusEnum } from '../../value-objects/user-status.vo';
import type { UserRoleEnum } from '../../value-objects/user-role.vo';
import { UserRole } from '../../value-objects/user-role.vo';
import { Email } from '../../value-objects/email.vo';
import { Username } from '../../value-objects/username.vo';
import type { CreateUserProps, UserAttributes, UserDTO } from './user.types';
import { InvalidOperationException, SharedAggregateRoot } from '@libs/nestjs-common';
import { Password } from '../../value-objects/password.vo';

export class User extends SharedAggregateRoot implements UserAttributes {
  email: Email;
  username: Username;
  password: Password;
  status: UserStatus;
  role: UserRole;
  lastLoginAt: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
  constructor(props: UserAttributes) {
    super(props.id);
    Object.assign(this, props);
  }

  static create(props: CreateUserProps): User {
    const id = uuidv4();
    const now = new Date();

    const user = new User({
      id,
      email: props.email,
      username: props.username,
      password: props.password,
      status: new UserStatus(UserStatusEnum.EMAIL_VERIFICATION_PENDING),
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
      username: props?.username || new Username('user' + Math.floor(Math.random() * 10000)),
      password: props?.password || Password.createFromPlainText('password'),
      status: props?.status ?? new UserStatus(UserStatusEnum.ACTIVE),
      role: props?.role ?? UserRole.random(),
      lastLoginAt: props?.lastLoginAt,
      createdAt: props?.createdAt || now,
      updatedAt: props?.updatedAt || now,
    });
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

  verifyEmail(): void {
    if (!this.isEmailVerificationPending()) {
      throw new InvalidOperationException('verifyEmail', this.status.toValue());
    }
    this.status = UserStatus.active();
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

  isEmailVerificationPending(): boolean {
    return this.status.equals(UserStatus.emailVerificationPending());
  }

  recordLogin(): void {
    this.lastLoginAt = new Date();
    this.updatedAt = new Date();
  }

  static fromValue(value: UserDTO): User {
    return new User({
      id: value.id,
      email: new Email(value.email),
      username: new Username(value.username),
      password: Password.createFromHash(value.password),
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
      password: this.password.toValue(),
      status: this.status.toValue(),
      role: this.role.toValue(),
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
