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
import { InvalidOperationException, SharedAggregateRoot, Id, DateVO } from '@libs/nestjs-common';

let _seq = 1;

export class User extends SharedAggregateRoot implements UserAttributes {
  email: Email;
  username: Username;
  password: Password;
  status: UserStatus;
  role: UserRole;
  lastLoginAt: Date | undefined;
  createdAt: DateVO;
  updatedAt: DateVO;
  constructor(props: UserAttributes) {
    super(props.id);
    Object.assign(this, props);
  }

  static create(props: CreateUserProps): User {
    const id = uuidv4();
    const now = new Date();

    const user = new User({
      id: new Id(id),
      email: props.email,
      username: props.username,
      password: props.password,
      status: new UserStatus(UserStatusEnum.EMAIL_VERIFICATION_PENDING),
      role: props.role,
      lastLoginAt: undefined,
      createdAt: new DateVO(now),
      updatedAt: new DateVO(now),
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
      createdAt: props?.createdAt || new DateVO(new Date()),
      updatedAt: props?.updatedAt || new DateVO(new Date()),
    });
  }

  activate(): void {
    if (this.status.equals(UserStatus.active())) {
      return;
    }
    this.status = UserStatus.active();
    this.updatedAt = new DateVO(new Date());
  }

  deactivate(): void {
    if (this.status.equals(UserStatus.inactive())) {
      return;
    }
    this.status = UserStatus.inactive();
    this.updatedAt = new DateVO(new Date());
  }

  verifyEmail(): void {
    if (!this.isEmailVerificationPending()) {
      throw new InvalidOperationException('verifyEmail', this.status.toValue());
    }
    this.status = UserStatus.active();
    this.updatedAt = new DateVO(new Date());
  }

  hasRole(role: UserRole): boolean {
    return this.role.equals(role);
  }

  changeRole(role: UserRole): void {
    if (!this.hasRole(role)) {
      this.role = role;
      this.updatedAt = new DateVO(new Date());
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
    this.updatedAt = new DateVO(new Date());
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
      createdAt: new DateVO(value.createdAt),
      updatedAt: new DateVO(value.updatedAt),
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
      createdAt: this.createdAt.toValue(),
      updatedAt: this.updatedAt.toValue(),
    };
  }
}
