import { v4 as uuidv4 } from 'uuid';
import { UserRegisteredDomainEvent } from '../../events/user-registered.domain-event';
import type { UserRoleEnum } from '../../value-objects';
import {
  UserStatus,
  UserStatusEnum,
  UserRole,
  Email,
  Username,
  Password,
} from '../../value-objects';
import type { CreateUserProps, UserAttributes, UserDTO } from './user.types';
import {
  InvalidOperationException,
  SharedAggregateRoot,
  Id,
  Timestamps,
} from '@libs/nestjs-common';

let _seq = 1;

export class User extends SharedAggregateRoot implements UserAttributes {
  email: Email;
  username: Username;
  password: Password;
  status: UserStatus;
  role: UserRole;
  lastLoginAt: Date | undefined;
  timestamps: Timestamps;
  constructor(props: UserAttributes) {
    super(props.id);
    Object.assign(this, props);
  }

  static create(props: CreateUserProps): User {
    const id = uuidv4();

    const user = new User({
      id: new Id(id),
      email: props.email,
      username: props.username,
      password: props.password,
      status: new UserStatus(UserStatusEnum.EMAIL_VERIFICATION_PENDING),
      role: props.role,
      lastLoginAt: undefined,
      timestamps: Timestamps.create(),
    });

    user.apply(
      new UserRegisteredDomainEvent({
        userId: user.id,
        email: props.email,
        username: props.username,
        role: user.role,
      }),
    );

    return user;
  }

  static random(props?: Partial<UserAttributes>): User {
    _seq++;
    return new User({
      id: props?.id || new Id(uuidv4()),
      email: props?.email || new Email('user' + _seq + '@example.com'),
      username: props?.username || new Username('user' + _seq),
      password: props?.password || Password.createFromPlainTextSync('password' + _seq),
      status: props?.status ?? UserStatus.random(),
      role: props?.role ?? UserRole.random(),
      lastLoginAt: props?.lastLoginAt,
      timestamps: props?.timestamps || Timestamps.create(),
    });
  }

  activate(): void {
    if (this.status.equals(UserStatus.active())) {
      return;
    }
    this.status = UserStatus.active();
    this.timestamps.update();
  }

  deactivate(): void {
    if (this.status.equals(UserStatus.inactive())) {
      return;
    }
    this.status = UserStatus.inactive();
    this.timestamps.update();
  }

  verifyEmail(): void {
    if (!this.isEmailVerificationPending()) {
      throw new InvalidOperationException('verifyEmail', this.status.toValue());
    }
    this.status = UserStatus.active();
    this.timestamps.update();
  }

  hasRole(role: UserRole): boolean {
    return this.role.equals(role);
  }

  changeRole(role: UserRole): void {
    if (!this.hasRole(role)) {
      this.role = role;
      this.timestamps.update();
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
    this.timestamps.update();
  }

  static fromValue(value: UserDTO): User {
    return new User({
      id: new Id(value.id),
      email: new Email(value.email),
      username: new Username(value.username),
      password: Password.createFromHash(value.password),
      status: new UserStatus(value.status as UserStatusEnum),
      role: new UserRole(value.role as UserRoleEnum),
      lastLoginAt: value.lastLoginAt ? new Date(value.lastLoginAt) : undefined,
      timestamps: new Timestamps({
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
      }),
    });
  }

  toValue(): UserDTO {
    return {
      id: this.id.toValue(),
      email: this.email.toValue(),
      username: this.username.toValue(),
      password: this.password.toValue(),
      status: this.status.toValue(),
      role: this.role.toValue(),
      lastLoginAt: this.lastLoginAt,
      createdAt: this.timestamps.createdAt.toValue(),
      updatedAt: this.timestamps.updatedAt.toValue(),
    };
  }
}
