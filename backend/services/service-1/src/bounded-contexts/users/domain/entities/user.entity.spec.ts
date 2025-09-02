import { User } from './user.entity';
import { Email } from '../value-objects/email.vo';
import { Username } from '../value-objects/username.vo';
import { Name } from '../value-objects/name.vo';
import { UserRole, UserRoleEnum } from '../value-objects/user-role.vo';
import { UserStatus, UserStatusEnum } from '../value-objects/user-status.vo';
import { UserRegisteredDomainEvent } from '../events/user-registered.domain-event';
import { UserProfileUpdatedDomainEvent } from '../events/user-profile-updated.domain-event';
import { UserProfile } from '../value-objects/user-profile.vo';

describe('User Entity', () => {
  describe('create', () => {
    it('should create a new user with required properties', () => {

      // Act
      const user = User.create({
        email: new Email('test@example.com'),
        username: new Username('testuser'),
        firstName: new Name('John'),
        lastName: new Name('Doe'),
        role: UserRole.user()
      });

      // Assert
      expect(user.id).toBeDefined();
      expect(user.email.toValue()).toBe('test@example.com');
      expect(user.username.toValue()).toBe('testuser');
      expect(user.profile.firstName.toValue()).toBe('John');
      expect(user.profile.lastName.toValue()).toBe('Doe');
      expect(user.status.toValue()).toBe(UserStatusEnum.ACTIVE);
      expect(user.role.toValue()).toBe(UserRoleEnum.USER);
      expect(user.lastLoginAt).toBeUndefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });


    it('should emit UserRegisteredEvent when created', () => {
      // Arrange
      const props = {
        email: new Email('test@example.com'),
        username: new Username('testuser'),
        firstName: new Name('John'),
        lastName: new Name('Doe'),
        role: UserRole.random()
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
      expect(user.profile.firstName.toValue()).toBeTruthy();
      expect(user.profile.lastName.toValue()).toBeTruthy();
      expect(user.status.toValue()).toBeTruthy();
      expect(user.role.toValue()).toBeTruthy();
      expect(user.lastLoginAt).toBeUndefined();
    });

    it('should create user with provided properties', () => {
      // Arrange
      const customEmail = new Email('custom@test.com');
      const customUsername = new Username('customuser');
      const customFirstName = new Name('Jane');
      const customLastName = new Name('Smith');
      const customRole = UserRole.random();
      const customStatus = UserStatusEnum.INACTIVE;
      const customLastLogin = new Date('2024-01-01');
      const customCreatedAt = new Date('2024-01-02');
      const customUpdatedAt = new Date('2024-01-03');

      // Act
      const user = User.random({
        email: customEmail,
        username: customUsername,
        profile: new UserProfile(customFirstName, customLastName),
        role: customRole,
        status: UserStatus.inactive(),
        lastLoginAt: customLastLogin,
        createdAt: customCreatedAt,
        updatedAt: customUpdatedAt
      });

      // Assert
      expect(user.email).toBe(customEmail);
      expect(user.username).toBe(customUsername);
      expect(user.profile.firstName).toBe(customFirstName);
      expect(user.profile.lastName).toBe(customLastName);
      expect(user.role).toBe(customRole);
      expect(user.status.toValue()).toBe(customStatus);
      expect(user.lastLoginAt).toBe(customLastLogin);
      expect(user.createdAt).toBe(customCreatedAt);
      expect(user.updatedAt).toBe(customUpdatedAt);
    });

    it('should handle empty string names correctly with nullish coalescing', () => {
      // Act
      const user = User.random({
        profile: new UserProfile(new Name(''), new Name(''))
      });

      // Assert
      expect(user.profile.firstName.toValue()).toBe('');
      expect(user.profile.lastName.toValue()).toBe('');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile and emit domain event', () => {
      // Arrange
      const user = User.random({
        profile: new UserProfile(new Name('Original'), new Name('Name'))
      });

      const newFirstName = new Name('Updated');
      const newLastName = new Name('Updated Last');

      // Act
      user.updateProfile({
        firstName: newFirstName,
        lastName: newLastName
      });

      // Assert
      expect(user.profile.firstName.toValue()).toBe('Updated');
      expect(user.profile.lastName.toValue()).toBe('Updated Last');
      expect(user.updatedAt).toBeInstanceOf(Date);

      const domainEvents = user.getUncommittedEvents();
      expect(domainEvents).toHaveLength(1);
      expect(domainEvents[0]).toBeInstanceOf(UserProfileUpdatedDomainEvent);

      const event = domainEvents[0] as UserProfileUpdatedDomainEvent;
      expect(event.aggregateId).toBe(user.id);
      expect(event.previousFirstName).toBe('Original');
      expect(event.previousLastName).toBe('Name');
      expect(event.firstName).toBe('Updated');
      expect(event.lastName).toBe('Updated Last');
    });

    it('should handle empty string names in profile update', () => {
      // Arrange
      const user = User.random();
      
      // Act
      user.updateProfile({
        firstName: new Name(''),
        lastName: new Name('')
      });

      // Assert
      expect(user.profile.firstName.toValue()).toBe('');
      expect(user.profile.lastName.toValue()).toBe('');
    });
  });

  describe('activate', () => {
    it('should activate inactive user', async () => {
      // Arrange
      const user = User.random({ status: UserStatus.inactive() });

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Act
      user.activate();

      // Assert
      expect(user.status.toValue()).toBe(UserStatusEnum.ACTIVE);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should not change active user', () => {
      // Arrange
      const user = User.random({ status: UserStatus.active() });
      const originalUpdatedAt = user.updatedAt;

      // Act
      user.activate();

      // Assert
      expect(user.status.toValue()).toBe(UserStatusEnum.ACTIVE);
      expect(user.updatedAt).toBe(originalUpdatedAt);
    });
  });

  describe('deactivate', () => {
    it('should deactivate active user', async () => {
      // Arrange
      const user = User.random({ status: UserStatus.active() });

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Act
      user.deactivate();

      // Assert
      expect(user.status.toValue()).toBe(UserStatusEnum.INACTIVE);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should not change inactive user', () => {
      // Arrange
      const user = User.random({ status: UserStatus.inactive() });
      const originalUpdatedAt = user.updatedAt;

      // Act
      user.deactivate();

      // Assert
      expect(user.status.toValue()).toBe(UserStatusEnum.INACTIVE);
      expect(user.updatedAt).toBe(originalUpdatedAt);
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
      await new Promise(resolve => setTimeout(resolve, 10));

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

  describe('serialization', () => {
    it('should convert to primitives correctly', () => {
      // Arrange
      const user = User.random({
        email: new Email('test@example.com'),
        username: new Username('testuser'),
        profile: new UserProfile(new Name('John'), new Name('Doe')),
        role: UserRole.admin(),
        status: UserStatus.active(),
        lastLoginAt: new Date('2024-01-01T12:00:00Z')
      });

      // Act
      const value = user.toValue();

      // Assert
      expect(value).toEqual({
        id: user.id,
        email: 'test@example.com',
        username: 'testuser',
        profile: {
          firstName: 'John',
          lastName: 'Doe'
        },
        status: UserStatusEnum.ACTIVE,
        role: UserRoleEnum.ADMIN,
        lastLoginAt: new Date('2024-01-01T12:00:00Z'),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    });

    it('should recreate user from primitives correctly', () => {
      // Arrange
      const primitives = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        username: 'testuser',
        profile: {
          firstName: 'John',
          lastName: 'Doe'
        },
        status: UserStatusEnum.INACTIVE,
        role: UserRoleEnum.ADMIN,
        lastLoginAt: new Date('2024-01-01T12:00:00Z'),
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T11:00:00Z')
      };

      // Act
      const user = User.fromValue(primitives);

      // Assert
      expect(user.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(user.email.toValue()).toBe('test@example.com');
      expect(user.username.toValue()).toBe('testuser');
      expect(user.profile.firstName.toValue()).toBe('John');
      expect(user.profile.lastName.toValue()).toBe('Doe');
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
    it('should handle user with empty name components', () => {
      // Arrange & Act
      const user = User.random({
        profile: new UserProfile(
          new Name(''),
          new Name('')
        )
      });

      // Assert
      expect(user.profile.firstName.toValue()).toBe('');
      expect(user.profile.lastName.toValue()).toBe('');
      
      // Should still serialize/deserialize correctly
      const primitives = user.toValue();
      const reconstructed = User.fromValue(primitives);
      expect(reconstructed.profile.firstName.toValue()).toBe('');
      expect(reconstructed.profile.lastName.toValue()).toBe('');
    });


    it('should generate unique IDs for different users', () => {
      // Act
      const user1 = User.random();
      const user2 = User.random();

      // Assert
      expect(user1.id).not.toBe(user2.id);
      expect(user1.username.toValue()).not.toBe(user2.username.toValue());
    });

    it('should handle multiple profile updates correctly', () => {
      // Arrange
      const user = User.random();
      user.commit();

      // Act
      user.updateProfile({
        firstName: new Name('First'),
        lastName: new Name('Update')
      });

      user.updateProfile({
        firstName: new Name('Second'),
        lastName: new Name('Update')
      });

      // Assert
      expect(user.profile.firstName.toValue()).toBe('Second');
      expect(user.profile.lastName.toValue()).toBe('Update');
      
      const events = user.getUncommittedEvents();
      expect(events).toHaveLength(2);
      expect(events.every(e => e instanceof UserProfileUpdatedDomainEvent)).toBe(true);
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
      user.updateProfile({
        firstName: new Name('New'),
        lastName: new Name('Name')
      });
      user.activate();
      user.changeRole(UserRole.admin());

      // Assert - core identifiers should remain unchanged
      expect(user.id).toBe(originalId);
      expect(user.email).toBe(originalEmail);
      expect(user.username).toBe(originalUsername);
      expect(user.createdAt).toBe(originalCreatedAt);
    });

    it('should update timestamp on state changes', async () => {
      // Arrange
      const user = User.random({ status: UserStatus.inactive() });
      const originalUpdatedAt = user.updatedAt;

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Act
      user.activate();

      // Assert
      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should preserve domain event order', () => {
      // Arrange
      const user = User.create({
        email: new Email('test@example.com'),
        username: new Username('testuser'),
        firstName: new Name('John'),
        lastName: new Name('Doe'),
        role: UserRole.user()
      });

      // Act
      user.updateProfile({
        firstName: new Name('Jane'),
        lastName: new Name('Smith')
      });

      // Assert
      const events = user.getUncommittedEvents();
      expect(events).toHaveLength(2);
      expect(events[0]).toBeInstanceOf(UserRegisteredDomainEvent);
      expect(events[1]).toBeInstanceOf(UserProfileUpdatedDomainEvent);
    });
  });
});