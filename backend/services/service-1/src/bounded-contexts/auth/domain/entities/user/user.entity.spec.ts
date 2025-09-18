import { User } from './user.entity';
import {
  Email,
  Username,
  UserRole,
  UserRoleEnum,
  UserStatus,
  UserStatusEnum,
  Password,
  LastLogin,
} from '@bc/auth/domain/value-objects';
import { UserRegistered_DomainEvent } from '@bc/auth/domain/events/user-registered.domain-event';
import { InvalidOperationException, Timestamps, Id, wait, DateVO } from '@libs/nestjs-common';
import { UserDTO } from './user.dto';
import { UserDeleted_DomainEvent } from '../../events/user-deleted.domain-event';

describe('User Entity', () => {
  describe('create()', () => {
    it('should create a new user with email verification pending status', async () => {
      // Arrange
      const email = new Email('test@example.com');
      const username = new Username('testuser');
      const password = await Password.createFromPlainText('Password123!');
      const role = new UserRole(UserRoleEnum.USER);

      // Act
      const user = User.create({ email, username, password, role });

      // Assert
      expect(user).toBeInstanceOf(User);
      expect(user.id).toBeInstanceOf(Id);
      expect(user.email).toBe(email);
      expect(user.username).toBe(username);
      expect(user.password).toBe(password);
      expect(user.role).toBe(role);
      expect(user.status.toValue()).toBe(UserStatusEnum.EMAIL_VERIFICATION_PENDING);
      expect(user.lastLogin).toBeInstanceOf(LastLogin);
      expect(user.lastLogin.isNever()).toBe(true);
      expect(user.timestamps).toBeInstanceOf(Timestamps);
    });

    it('should emit UserRegisteredDomainEvent when created', async () => {
      // Arrange
      const email = new Email('test@example.com');
      const username = new Username('testuser');
      const password = await Password.createFromPlainText('Password123!');
      const role = new UserRole(UserRoleEnum.ADMIN);

      // Act
      const user = User.create({
        email,
        username,
        password,
        role,
      });

      // Assert
      const events = user.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserRegistered_DomainEvent);

      const event = events[0] as UserRegistered_DomainEvent;
      expect(event.aggregateId).toBe(user.id);
      expect(event.email).toBe(email);
      expect(event.username).toBe(username);
      expect(event.role).toBe(role);
    });

    it('should default role to user when not provided', async () => {
      const email = new Email('default-role@example.com');
      const username = new Username('defaultrole');
      const password = await Password.createFromPlainText('Password123!');

      const user = User.create({ email, username, password });

      expect(user.role.equals(UserRole.user())).toBe(true);
      const events = user.getUncommittedEvents();
      expect(events).toHaveLength(1);
      const event = events[0] as UserRegistered_DomainEvent;
      expect(event.role.equals(UserRole.user())).toBe(true);
    });
  });

  describe('random()', () => {
    it('should create a user with random values', () => {
      // Act
      const user = User.random();

      // Assert
      expect(user).toBeInstanceOf(User);
      expect(user.id).toBeInstanceOf(Id);
      expect(user.email).toBeInstanceOf(Email);
      expect(user.username).toBeInstanceOf(Username);
      expect(user.password).toBeInstanceOf(Password);
      expect(user.status).toBeInstanceOf(UserStatus);
      expect(user.role).toBeInstanceOf(UserRole);
      expect(user.lastLogin).toBeInstanceOf(LastLogin);
      expect(user.timestamps).toBeInstanceOf(Timestamps);
    });

    it('should accept partial overrides', () => {
      // Arrange
      const customEmail = new Email('custom@example.com');
      const customStatus = UserStatus.active();
      const customRole = UserRole.admin();

      // Act
      const user = User.random({
        email: customEmail,
        status: customStatus,
        role: customRole,
      });

      // Assert
      expect(user.email).toBe(customEmail);
      expect(user.status).toBe(customStatus);
      expect(user.role).toBe(customRole);
    });

    it('should generate unique users on each call', () => {
      // Act
      const user1 = User.random();
      const user2 = User.random();

      // Assert
      expect(user1.id.toValue()).not.toBe(user2.id.toValue());
      expect(user1.email.toValue()).not.toBe(user2.email.toValue());
      expect(user1.username.toValue()).not.toBe(user2.username.toValue());
    });
  });

  describe('activate()', () => {
    it('should activate an inactive user', async () => {
      // Arrange
      const user = User.random({ status: UserStatus.inactive() });
      const originalUpdatedAt = new DateVO(user.timestamps.updatedAt.toValue());
      await wait(10);

      // Act
      user.activate();

      // Assert
      expect(user.status.toValue()).toBe(UserStatusEnum.ACTIVE);
      expect(user.timestamps.updatedAt.isAfter(originalUpdatedAt)).toBe(true);
    });

    it('should throw InvalidOperationException for email-verification-pending user', () => {
      // Arrange
      const user = User.random({ status: UserStatus.emailVerificationPending() });
      // Act
      expect(() => user.activate()).toThrow(InvalidOperationException);
    });

    it('should throw InvalidOperationException for active user', () => {
      // Arrange
      const user = User.random({ status: UserStatus.active() });
      // Act
      expect(() => user.activate()).toThrow(InvalidOperationException);
    });
  });

  describe('deactivate()', () => {
    it('should deactivate an active user', async () => {
      // Arrange
      const user = User.random({ status: UserStatus.active() });
      const originalUpdatedAt = new DateVO(user.timestamps.updatedAt.toValue());
      await wait(10);

      // Act
      user.deactivate();

      // Assert
      expect(user.status.toValue()).toBe(UserStatusEnum.INACTIVE);
      expect(user.timestamps.updatedAt.isAfter(originalUpdatedAt)).toBe(true);
    });

    it('should throw InvalidOperationException for email-verification-pending user', () => {
      // Arrange
      const user = User.random({ status: UserStatus.emailVerificationPending() });
      // Act
      expect(() => user.deactivate()).toThrow(InvalidOperationException);
    });

    it('should throw InvalidOperationException for inactive user', () => {
      // Arrange
      const user = User.random({ status: UserStatus.inactive() });
      // Act
      expect(() => user.deactivate()).toThrow(InvalidOperationException);
    });
  });

  describe('verifyEmail()', () => {
    it('should verify email for user with pending verification status', () => {
      // Arrange
      const user = User.random({ status: UserStatus.emailVerificationPending() });
      const originalUpdatedAt = new DateVO(user.timestamps.updatedAt.toValue());

      // Act
      user.verifyEmail();

      // Assert
      expect(user.status.toValue()).toBe(UserStatusEnum.ACTIVE);
      expect(user.timestamps.updatedAt.isAfter(originalUpdatedAt)).toBe(true);
    });

    it('should throw InvalidOperationException for active user', () => {
      // Arrange
      const user = User.random({ status: UserStatus.active() });

      // Act & Assert
      expect(() => user.verifyEmail()).toThrow(InvalidOperationException);
    });

    it('should throw InvalidOperationException for inactive user', () => {
      // Arrange
      const user = User.random({ status: UserStatus.inactive() });

      // Act & Assert
      expect(() => user.verifyEmail()).toThrow(InvalidOperationException);
    });
  });

  describe('hasRole()', () => {
    it('should return true when user has the specified role', () => {
      // Arrange
      const adminRole = UserRole.admin();
      const user = User.random({ role: adminRole });

      // Act & Assert
      expect(user.hasRole(adminRole)).toBe(true);
    });

    it('should return false when user does not have the specified role', () => {
      // Arrange
      const user = User.random({ role: UserRole.user() });

      // Act & Assert
      expect(user.hasRole(UserRole.admin())).toBe(false);
    });
  });

  describe('changeRole()', () => {
    it('should change role when new role is different', () => {
      // Arrange
      const user = User.random({ role: UserRole.user() });
      const originalUpdatedAt = new DateVO(user.timestamps.updatedAt.toValue());
      const newRole = UserRole.admin();

      // Act
      user.changeRole(newRole);

      // Assert
      expect(user.role).toBe(newRole);
      expect(user.hasRole(newRole)).toBe(true);
      expect(user.timestamps.updatedAt.isAfter(originalUpdatedAt)).toBe(true);
    });

    it('should not update timestamps when changing to the same role', () => {
      // Arrange
      const role = UserRole.user();
      const user = User.random({ role });
      const originalUpdatedAt = new DateVO(user.timestamps.updatedAt.toValue());

      // Act
      user.changeRole(role);

      // Assert
      expect(user.role).toBe(role);
      expect(user.timestamps.updatedAt.equals(originalUpdatedAt)).toBe(true);
    });
  });

  describe('isActive()', () => {
    it('should return true for active user', () => {
      // Arrange
      const user = User.random({ status: UserStatus.active() });

      // Act & Assert
      expect(user.isActive()).toBe(true);
    });

    it('should return false for inactive user', () => {
      // Arrange
      const user = User.random({ status: UserStatus.inactive() });

      // Act & Assert
      expect(user.isActive()).toBe(false);
    });

    it('should return false for email verification pending user', () => {
      // Arrange
      const user = User.random({ status: UserStatus.emailVerificationPending() });

      // Act & Assert
      expect(user.isActive()).toBe(false);
    });
  });

  describe('isEmailVerificationPending()', () => {
    it('should return true for user with email verification pending status', () => {
      // Arrange
      const user = User.random({ status: UserStatus.emailVerificationPending() });

      // Act & Assert
      expect(user.isEmailVerificationPending()).toBe(true);
    });

    it('should return false for active user', () => {
      // Arrange
      const user = User.random({ status: UserStatus.active() });

      // Act & Assert
      expect(user.isEmailVerificationPending()).toBe(false);
    });

    it('should return false for inactive user', () => {
      // Arrange
      const user = User.random({ status: UserStatus.inactive() });

      // Act & Assert
      expect(user.isEmailVerificationPending()).toBe(false);
    });
  });

  describe('recordLogin()', () => {
    it('should update lastLogin to current time', async () => {
      // Arrange
      const user = User.random();
      const beforeLogin = DateVO.now();

      await wait(10);

      // Act
      user.recordLogin();

      await wait(10);

      const afterLogin = DateVO.now();

      // Assert
      expect(user.lastLogin.isNever()).toBe(false);
      expect(user.lastLogin.isAfter(beforeLogin)).toBe(true);
      expect(user.lastLogin.isBefore(afterLogin)).toBe(true);
    });

    it('should update timestamps when recording login', async () => {
      // Arrange
      const user = User.random();
      const originalUpdatedAt = new DateVO(user.timestamps.updatedAt.toValue());

      await wait(10);

      // Act
      user.recordLogin();

      // Assert
      expect(user.timestamps.updatedAt.isAfter(originalUpdatedAt)).toBe(true);
    });

    it('should update lastLogin from never to actual date', () => {
      // Arrange
      const user = User.random({ lastLogin: LastLogin.never() });
      expect(user.lastLogin.isNever()).toBe(true);

      // Act
      user.recordLogin();

      // Assert
      expect(user.lastLogin.isNever()).toBe(false);
      expect(user.lastLogin.toValue()).toBeInstanceOf(Date);
    });
  });

  describe('fromValue()', () => {
    it('should create user from DTO', async () => {
      // Arrange
      const dto = UserDTO.random();

      // Act
      const user = User.fromValue(dto);

      // Assert
      expect(user.id.toValue()).toBe(dto.id);
      expect(user.email.toValue()).toBe(dto.email);
      expect(user.username.toValue()).toBe(dto.username);
      expect(user.password.toValue()).toBe(dto.password);
      expect(user.status.toValue()).toBe(dto.status);
      expect(user.role.toValue()).toBe(dto.role);
      expect(user.lastLogin.toValue()).toEqual(dto.lastLogin);
      expect(user.timestamps.createdAt.toValue()).toEqual(dto.createdAt);
      expect(user.timestamps.updatedAt.toValue()).toEqual(dto.updatedAt);
    });
  });

  describe('toValue()', () => {
    it('should convert user to DTO', async () => {
      // Arrange
      const user = User.random({
        email: new Email('test@example.com'),
        username: new Username('testuser'),
        password: await Password.createFromPlainText('Password123!'),
        status: UserStatus.active(),
        role: UserRole.admin(),
        lastLogin: new LastLogin(new Date('2024-01-01T12:00:00Z')),
      });

      // Act
      const dto = user.toValue();

      // Assert
      expect(dto.id).toBe(user.id.toValue());
      expect(dto.email).toBe('test@example.com');
      expect(dto.username).toBe('testuser');
      const password = await Password.createFromHash(dto.password);
      expect(await password.verify('Password123!')).toBe(true);
      expect(dto.status).toBe(UserStatusEnum.ACTIVE);
      expect(dto.role).toBe(UserRoleEnum.ADMIN);
      expect(dto.lastLogin).toEqual(new Date('2024-01-01T12:00:00Z'));
      expect(dto.createdAt).toBeInstanceOf(Date);
      expect(dto.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('delete()', () => {
    it('should mark user as deleted and emit domain event', () => {
      const user = User.random({ status: UserStatus.active() });

      user.delete();

      expect(user.status.toValue()).toBe(UserStatusEnum.DELETED);
      const events = user.getUncommittedEvents();
      expect(events).toHaveLength(1);
      const event = events[0] as UserDeleted_DomainEvent;
      expect(event.constructor.name).toBe('UserDeleted_DomainEvent');
      expect(event.aggregateId.toValue()).toBe(user.id.toValue());
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete user lifecycle', async () => {
      // Create user
      const user = User.create({
        email: new Email('lifecycle@example.com'),
        username: new Username('lifecycleuser'),
        password: await Password.createFromPlainText('Password123!'),
        role: new UserRole(UserRoleEnum.USER),
      });

      // Verify initial state
      expect(user.isEmailVerificationPending()).toBe(true);
      expect(user.isActive()).toBe(false);
      expect(user.lastLogin.isNever()).toBe(true);

      // Verify email
      user.verifyEmail();
      expect(user.isActive()).toBe(true);
      expect(user.isEmailVerificationPending()).toBe(false);

      // Record login
      user.recordLogin();
      expect(user.lastLogin.isNever()).toBe(false);

      // Change role
      user.changeRole(UserRole.admin());
      expect(user.hasRole(UserRole.admin())).toBe(true);

      // Deactivate
      user.deactivate();
      expect(user.isActive()).toBe(false);

      // Reactivate
      user.activate();
      expect(user.isActive()).toBe(true);
    });

    it('should serialize and deserialize correctly', async () => {
      // Arrange
      const originalUser = User.random({
        email: new Email('serialize@example.com'),
        username: new Username('serializeuser'),
        password: await Password.createFromPlainText('Password123!'),
        status: UserStatus.active(),
        role: UserRole.admin(),
        lastLogin: new LastLogin(new Date('2024-06-15T14:30:00Z')),
      });

      // Act
      const dto = originalUser.toValue();
      const restoredUser = User.fromValue(dto);

      // Assert
      expect(restoredUser.id.toValue()).toBe(originalUser.id.toValue());
      expect(restoredUser.email.toValue()).toBe(originalUser.email.toValue());
      expect(restoredUser.username.toValue()).toBe(originalUser.username.toValue());
      expect(restoredUser.password.toValue()).toBe(originalUser.password.toValue());
      expect(restoredUser.status.toValue()).toBe(originalUser.status.toValue());
      expect(restoredUser.role.toValue()).toBe(originalUser.role.toValue());
      expect(restoredUser.lastLogin.toValue()).toEqual(originalUser.lastLogin.toValue());
      expect(restoredUser.timestamps.createdAt.toValue()).toEqual(
        originalUser.timestamps.createdAt.toValue(),
      );
      expect(restoredUser.timestamps.updatedAt.toValue()).toEqual(
        originalUser.timestamps.updatedAt.toValue(),
      );
    });

    it('should maintain domain events on creation', async () => {
      // Arrange & Act
      const user = User.create({
        email: new Email('events@example.com'),
        username: new Username('eventsuser'),
        password: await Password.createFromPlainText('Password123!'),
        role: new UserRole(UserRoleEnum.USER),
      });

      // Assert - UserRegisteredDomainEvent should be emitted
      const events = user.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserRegistered_DomainEvent);
    });
  });
});
