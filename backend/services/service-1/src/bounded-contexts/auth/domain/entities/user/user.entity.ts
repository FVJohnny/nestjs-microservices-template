import { UserRegistered_DomainEvent } from '@bc/auth/domain/events/user-registered.domain-event';
import { UserDeleted_DomainEvent } from '@bc/auth/domain/events/user-deleted.domain-event';
import { UserPasswordChanged_DomainEvent } from '@bc/auth/domain/events/password-changed.domain-event';
import { UserLogout_DomainEvent } from '@bc/auth/domain/events/user-logout.domain-event';
import type { UserRoleEnum } from '@bc/auth/domain/value-objects';
import {
  UserStatus,
  UserStatusEnum,
  UserRole,
  Email,
  Username,
  Password,
  LastLogin,
} from '@bc/auth/domain/value-objects';
import type { UserDTO } from './user.dto';
import {
  InvalidOperationException,
  SharedAggregateRoot,
  Id,
  Timestamps,
  DateVO,
} from '@libs/nestjs-common';

export interface CreateUserProps {
  email: Email;
  username: Username;
  password: Password;
  role?: UserRole;
}
export interface UserAttributes {
  id: Id;
  email: Email;
  username: Username;
  password: Password;
  status: UserStatus;
  role: UserRole;
  lastLogin: LastLogin;
  timestamps: Timestamps;
}
export class User extends SharedAggregateRoot implements UserAttributes {
  email: Email;
  username: Username;
  password: Password;
  status: UserStatus;
  role: UserRole;
  lastLogin: LastLogin;

  constructor(props: UserAttributes) {
    super(props.id, props.timestamps);
    this.email = props.email;
    this.username = props.username;
    this.password = props.password;
    this.status = props.status;
    this.role = props.role;
    this.lastLogin = props.lastLogin;
  }

  static create(props: CreateUserProps): User {
    const role = props.role ?? UserRole.user();
    const user = new User({
      id: Id.random(),
      email: props.email,
      username: props.username,
      password: props.password,
      status: new UserStatus(UserStatusEnum.EMAIL_VERIFICATION_PENDING),
      role,
      lastLogin: LastLogin.never(),
      timestamps: Timestamps.create(),
    });

    user.apply(new UserRegistered_DomainEvent(user.id, user.email, user.username, user.role));

    return user;
  }

  static random(props?: Partial<UserAttributes>): User {
    return new User({
      id: props?.id || Id.random(),
      email: props?.email || Email.random(),
      username: props?.username || Username.random(),
      password: props?.password || Password.random(),
      status: props?.status || UserStatus.random(),
      role: props?.role || UserRole.random(),
      lastLogin: props?.lastLogin || LastLogin.random(),
      timestamps: props?.timestamps || Timestamps.random(),
    });
  }

  activate(): void {
    if (!this.isInactive()) {
      throw new InvalidOperationException('activate', this.status.toValue());
    }
    this.status = UserStatus.active();
    this.timestamps = new Timestamps(this.timestamps.createdAt, DateVO.now());
  }

  deactivate(): void {
    if (!this.isActive()) {
      throw new InvalidOperationException('deactivate', this.status.toValue());
    }
    this.status = UserStatus.inactive();
    this.timestamps = new Timestamps(this.timestamps.createdAt, DateVO.now());
  }

  verifyEmail(): void {
    if (!this.isEmailVerificationPending()) {
      throw new InvalidOperationException('verifyEmail', this.status.toValue());
    }
    this.status = UserStatus.active();
    this.timestamps = new Timestamps(this.timestamps.createdAt, DateVO.now());
  }

  hasRole(role: UserRole): boolean {
    return this.role.equals(role);
  }

  changeRole(role: UserRole): void {
    if (!this.hasRole(role)) {
      this.role = role;
      this.timestamps = new Timestamps(this.timestamps.createdAt, DateVO.now());
    }
  }

  changePassword(newPassword: Password): void {
    this.password = newPassword;
    this.timestamps = new Timestamps(this.timestamps.createdAt, DateVO.now());
    this.apply(new UserPasswordChanged_DomainEvent(this.id, this.email));
    this.logout();
  }

  logout(): void {
    this.apply(new UserLogout_DomainEvent(this.id));
  }

  isActive(): boolean {
    return this.status.equals(UserStatus.active());
  }

  isEmailVerificationPending(): boolean {
    return this.status.equals(UserStatus.emailVerificationPending());
  }

  isInactive(): boolean {
    return this.status.equals(UserStatus.inactive());
  }

  recordLogin(): void {
    this.lastLogin = LastLogin.now();
    this.timestamps = new Timestamps(this.timestamps.createdAt, DateVO.now());
  }

  delete(): void {
    this.status = UserStatus.deleted();
    this.timestamps = new Timestamps(this.timestamps.createdAt, DateVO.now());
    this.apply(new UserDeleted_DomainEvent(this.id));
  }

  static fromValue(value: UserDTO): User {
    return new User({
      id: new Id(value.id),
      email: new Email(value.email),
      username: new Username(value.username),
      password: Password.createFromHash(value.password),
      status: new UserStatus(value.status as UserStatusEnum),
      role: new UserRole(value.role as UserRoleEnum),
      lastLogin: new LastLogin(value.lastLogin),
      timestamps: new Timestamps(new DateVO(value.createdAt), new DateVO(value.updatedAt)),
    });
  }

  toValue(): UserDTO {
    return {
      ...super.toValue(),

      email: this.email.toValue(),
      username: this.username.toValue(),
      password: this.password.toValue(),
      status: this.status.toValue(),
      role: this.role.toValue(),
      lastLogin: this.lastLogin.toValue(),
    };
  }
}
