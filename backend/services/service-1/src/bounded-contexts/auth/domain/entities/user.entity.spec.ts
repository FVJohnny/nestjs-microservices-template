import { User } from './user.entity';
import { Email } from '../value-objects/email.vo';
import { Username } from '../value-objects/username.vo';
import { Name } from '../value-objects/name.vo';
import { UserRole, UserRoleEnum } from '../value-objects/user-role.vo';
import { UserStatus, UserStatusEnum } from '../value-objects/user-status.vo';
import { UserRegisteredDomainEvent } from '../events/user-registered.domain-event';
import { Password } from '../value-objects/password.vo';
import { InvalidOperationException } from '@libs/nestjs-common';

describe('User Entity', () => {
  describe('create', () => {
    it('should create a new user with required properties', () => {
      // Act
      const user = User.create({
        email: new Email('test@example.com'),
        username: new Username('testuser'),
        password: Password.createFromPlainText('user_password'),
        role: UserRole.user(),
      });

      // Assert
      expect(user.id).toBeDefined();
      expect(user.email.toValue()).toBe('test@example.com');
      expect(user.username.toValue()).toBe('testuser');
      expect(user.password.toValue()).not.toBe('user_password');
      expect(user.status.toValue()).toBe(UserStatusEnum.EMAIL_VERIFICATION_PENDING);
      expect(user.role.toValue()).toBe(UserRoleEnum.USER);
      expect(user.lastLoginAt).toBeUndefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.password.verify('user_password')).toBe(true);
    });

    it('should emit UserRegisteredEvent when created', () => {
      // Arrange
      const props = {
        email: new Email('test@example.com'),
        username: new Username('testuser'),
        password: Password.createFromPlainText('user_password'),
        role: UserRole.random(),
      };

      // Act
      const user = User.create(props);

      // Assert
      const domainEvents = user.getUncommittedEvents();
      expect(domainEvents).toHaveLength(1);
      expect(domainEvents[0]).toBeInstanceOf(UserRegisteredDomainEvent);

      const event = domainEvents[0] as UserRegisteredDomainEvent;
      expect(event.aggregateId).toBe(user.id);
      expect(event.email).toBe(props.email);
      expect(event.username).toBe(props.username);
      expect(event.role).toEqual(user.role);
      expect(event.occurredOn).toBeInstanceOf(Date);
    });
  });

  describe('random', () => {
    it('should create user with default values when no props provided', () => {
      // Act
      const user = User.random();

      // Assert
      expect(user.id).toBeDefined();
      expect(user.email.toValue()).toBeTruthy();
      expect(user.username.toValue()).toBeTruthy();
      expect(user.password.toValue()).toBeTruthy();
      expect(user.status.toValue()).toBeTruthy();
      expect(user.role.toValue()).toBeTruthy();
      expect(user.lastLoginAt).toBeUndefined();
    });

    it('should create user with provided properties', () => {
      // Arrange
      const customEmail = new Email('custom@test.com');
      const customUsername = new Username('customuser');
      const customRole = UserRole.random();
      const customStatus = UserStatusEnum.INACTIVE;
      const customLastLogin = new Date('2024-01-01');
      const customCreatedAt = new Date('2024-01-02');
      const customUpdatedAt = new Date('2024-01-03');

      // Act
      const user = User.random({
        email: customEmail,
        username: customUsername,
        password: Password.createFromPlainText('user_password'),
        role: customRole,
        status: UserStatus.inactive(),
        lastLoginAt: customLastLogin,
        createdAt: customCreatedAt,
        updatedAt: customUpdatedAt,
      });

      // Assert
      expect(user.email).toBe(customEmail);
      expect(user.username).toBe(customUsername);
      expect(user.password.verify('user_password')).toBe(true);
      expect(user.role).toBe(customRole);
      expect(user.status.toValue()).toBe(customStatus);
      expect(user.lastLoginAt).toBe(customLastLogin);
      expect(user.createdAt).toBe(customCreatedAt);
      expect(user.updatedAt).toBe(customUpdatedAt);
    });
  });

  describe('activate', () => {
    it('should activate inactive user', async () => {
      // Arrange
      const user = User.random({ status: UserStatus.inactive() });
      const originalUpdatedAt = user.updatedAt;
      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      user.activate();

      // Assert
      expect(user.status.toValue()).toBe(UserStatusEnum.ACTIVE);
      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should not change active user', () => {
      // Arrange
      const user = User.random({ status: UserStatus.active() });
      const originalUpdatedAt = user.updatedAt;

      // Act
      user.activate();

      // Assert
      expect(user.status.toValue()).toBe(UserStatusEnum.ACTIVE);
      expect(user.updatedAt.getTime()).toBe(originalUpdatedAt.getTime());
    });
  });

  describe('deactivate', () => {
    it('should deactivate active user', async () => {
      // Arrange
      const user = User.random({ status: UserStatus.active() });
      const originalUpdatedAt = user.updatedAt;

      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      user.deactivate();

      // Assert
      expect(user.status.toValue()).toBe(UserStatusEnum.INACTIVE);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should not change inactive user', () => {
      // Arrange
      const user = User.random({ status: UserStatus.inactive() });
      const originalUpdatedAt = user.updatedAt;

      // Act
      user.deactivate();

      // Assert
      expect(user.status.toValue()).toBe(UserStatusEnum.INACTIVE);
      expect(user.updatedAt.getTime()).toBe(originalUpdatedAt.getTime());
    });
  });

  describe('verifyEmail', () => {
    it('should verify email for user with pending verification', async () => {
      // Arrange
      const user = User.random({ status: UserStatus.emailVerificationPending() });
      const originalUpdatedAt = user.updatedAt;
      
      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      user.verifyEmail();

      // Assert
      expect(user.status.toValue()).toBe(UserStatusEnum.ACTIVE);
      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should throw InvalidOperationException for any status that is not email-verification-pending', () => {
      // Arrange
      for (const status of Object.values(UserStatusEnum)) {
        const user = User.random({ status: new UserStatus(status) });

        // Act & Assert
        if (status !== UserStatusEnum.EMAIL_VERIFICATION_PENDING) {
          expect(() => user.verifyEmail()).toThrow(InvalidOperationException);
        }
      }
    });

  });

  describe('role management', () => {
    it('should check if user has role', () => {
      // Arrange
      const adminRole = UserRole.admin();
      const userRole = UserRole.user();
      const user = User.random({ role: adminRole });

      // Act & Assert
      expect(user.hasRole(adminRole)).toBe(true);
      expect(user.hasRole(userRole)).toBe(false);
    });

    it('should change role when user has different role', async () => {
      // Arrange
      const user = User.random({ role: UserRole.user() });
      const originalUpdatedAt = user.updatedAt;
      const adminRole = UserRole.admin();

      // Wait to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      user.changeRole(adminRole);

      // Assert
      expect(user.hasRole(adminRole)).toBe(true);
      expect(user.role.toValue()).toBe(UserRoleEnum.ADMIN);
      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should not update timestamp when changing to same role', () => {
      // Arrange
      const userRole = UserRole.user();
      const user = User.random({ role: userRole });
      const originalUpdatedAt = user.updatedAt;

      // Act
      user.changeRole(userRole);

      // Assert
      expect(user.role).toBe(userRole);
      expect(user.updatedAt).toBe(originalUpdatedAt);
    });
  });

  describe('isActive', () => {
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
  });

  describe('isEmailVerificationPending', () => {
    it('should return true for user with email verification pending', () => {
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

    it('should return true for newly created user', () => {
      // Arrange
      const user = User.create({
        email: new Email('newuser@example.com'),
        username: new Username('newuser'),
        password: Password.createFromPlainText('password123'),
        role: UserRole.user(),
      });

      // Act & Assert
      expect(user.isEmailVerificationPending()).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should convert to primitives correctly', () => {
      // Arrange
      const user = User.random({
        email: new Email('test@example.com'),
        username: new Username('testuser'),
        password: Password.createFromPlainText('testpassword'),
        role: UserRole.admin(),
        status: UserStatus.active(),
        lastLoginAt: new Date('2024-01-01T12:00:00Z'),
      });

      // Act
      const value = user.toValue();

      // Assert
      expect(value.id).toBe(user.id);
      expect(value.email).toBe('test@example.com');
      expect(value.username).toBe('testuser');
      expect(value.password).toMatch(/^\$2[ayb]\$\d{2}\$/); // Check it's a bcrypt hash
      expect(value.status).toBe(UserStatusEnum.ACTIVE);
      expect(value.role).toBe(UserRoleEnum.ADMIN);
      expect(value.lastLoginAt).toEqual(new Date('2024-01-01T12:00:00Z'));
      expect(value.createdAt).toBe(user.createdAt);
      expect(value.updatedAt).toBe(user.updatedAt);
    });

    it('should recreate user from primitives correctly', async () => {
      // Arrange
      const passwordHash = Password.createFromPlainText('testpassword').toValue();
      const primitives = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        username: 'testuser',
        password: passwordHash,
        status: UserStatusEnum.INACTIVE,
        role: UserRoleEnum.ADMIN,
        lastLoginAt: new Date('2024-01-01T12:00:00Z'),
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T11:00:00Z'),
      };

      // Act
      const user = User.fromValue(primitives);

      // Assert
      expect(user.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(user.email.toValue()).toBe('test@example.com');
      expect(user.username.toValue()).toBe('testuser');
      expect(user.password.toValue()).toBe(passwordHash);
      // Verify password can verify against original plain text
      const canVerify = user.password.verify('testpassword');
      expect(canVerify).toBe(true);
      expect(user.status.toValue()).toBe(UserStatusEnum.INACTIVE);
      expect(user.role.toValue()).toBe(UserRoleEnum.ADMIN);
      expect(user.lastLoginAt).toEqual(new Date('2024-01-01T12:00:00Z'));
      expect(user.createdAt).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(user.updatedAt).toEqual(new Date('2024-01-01T11:00:00Z'));
    });

    it('should handle null lastLoginAt in serialization', () => {
      // Arrange
      const user = User.random();

      // Act
      const primitives = user.toValue();
      const reconstructed = User.fromValue(primitives);

      // Assert
      expect(primitives.lastLoginAt).toBeUndefined();
      expect(reconstructed.lastLoginAt).toBeUndefined();
    });
  });

  describe('edge cases', () => {

    it('should generate unique IDs for different users', () => {
      // Act
      const user1 = User.random();
      const user2 = User.random();

      // Assert
      expect(user1.id).not.toBe(user2.id);
      expect(user1.username.toValue()).not.toBe(user2.username.toValue());
    });
  });

  describe('business rules', () => {
    it('should maintain immutability of core identifiers', () => {
      // Arrange
      const user = User.random();
      const originalId = user.id;
      const originalEmail = user.email;
      const originalUsername = user.username;
      const originalCreatedAt = user.createdAt;

      // Act - perform various operations
      user.activate();
      user.changeRole(UserRole.admin());

      // Assert - core identifiers should remain unchanged
      expect(user.id).toBe(originalId);
      expect(user.email).toBe(originalEmail);
      expect(user.username).toBe(originalUsername);
      expect(user.createdAt).toBe(originalCreatedAt);
    });
  });
});
