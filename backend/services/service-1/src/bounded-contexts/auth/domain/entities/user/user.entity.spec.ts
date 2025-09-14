import { User } from './user.entity';
import { Email, Username, UserRole, UserRoleEnum, UserStatus, UserStatusEnum, Password } from '../../value-objects';
import { UserRegisteredDomainEvent } from '../../events/user-registered.domain-event';
import { InvalidOperationException, Timestamps } from '@libs/nestjs-common';
import { UserDTO } from './user.types';

describe('User Entity', () => {
  // Test data factories
  const createTestUser = async (overrides = {}) => {
    const defaults = {
      email: new Email('test@example.com'),
      username: new Username('testuser'),
      password: await Password.createFromPlainText('password123'),
      role: UserRole.user(),
    };
    return User.create({ ...defaults, ...overrides });
  };

  const waitForTimestamp = () => new Promise(resolve => setTimeout(resolve, 10));

  describe('Creation', () => {
    it('should create user with default status', async () => {
      const user = await createTestUser();

      expect(user.id).toBeDefined();
      expect(user.email.toValue()).toBe('test@example.com');
      expect(user.username.toValue()).toBe('testuser');
      expect(user.status.toValue()).toBe(UserStatusEnum.EMAIL_VERIFICATION_PENDING);
      expect(user.role.toValue()).toBe(UserRoleEnum.USER);
      expect(user.lastLoginAt).toBeUndefined();
      expect(user.timestamps).toBeInstanceOf(Timestamps);
      expect(user.timestamps.createdAt.toValue()).toBeInstanceOf(Date);
      expect(user.timestamps.updatedAt.toValue()).toBeInstanceOf(Date);
      expect(await user.password.verify('password123')).toBe(true);
    });

    it('should emit UserRegisteredDomainEvent', async () => {
      const user = await createTestUser();
      const events = user.getUncommittedEvents();

      expect(events).toHaveLength(1);
      const event = events[0] as UserRegisteredDomainEvent;
      expect(event).toBeInstanceOf(UserRegisteredDomainEvent);
      expect(event.aggregateId).toBe(user.id);
      expect(event.email).toBe(user.email);
      expect(event.username).toBe(user.username);
      expect(event.role).toBe(user.role);
    });
  });

  describe('Random Factory', () => {
    it('should create user with random values', () => {
      const user = User.random();

      expect(user.id).toBeDefined();
      expect(user.email.toValue()).toBeTruthy();
      expect(user.username.toValue()).toBeTruthy();
      expect(user.password.toValue()).toBeTruthy();
      expect(user.status.toValue()).toBeTruthy();
      expect(user.role.toValue()).toBeTruthy();
    });

    it('should accept overrides', async () => {
      const customEmail = new Email('custom@test.com');
      const customRole = UserRole.admin();
      
      const user = User.random({
        email: customEmail,
        role: customRole,
        status: UserStatus.inactive(),
      });

      expect(user.email).toBe(customEmail);
      expect(user.role).toBe(customRole);
      expect(user.status.toValue()).toBe(UserStatusEnum.INACTIVE);
    });

    it('should generate unique identifiers', () => {
      const user1 = User.random();
      const user2 = User.random();

      expect(user1.id).not.toBe(user2.id);
      expect(user1.username.toValue()).not.toBe(user2.username.toValue());
    });
  });

  describe('Status Management', () => {
    describe('activate', () => {
      it('should activate inactive user', async () => {
        const user = User.random({ status: UserStatus.inactive() });
        const originalUpdatedAt = user.timestamps.updatedAt;
        
        await waitForTimestamp();
        user.activate();

        expect(user.status.toValue()).toBe(UserStatusEnum.ACTIVE);
        expect(user.timestamps.updatedAt.toValue().getTime()).toBeGreaterThan(originalUpdatedAt.toValue().getTime());
      });

      it('should not update already active user', () => {
        const user = User.random({ status: UserStatus.active() });
        const originalUpdatedAt = user.timestamps.updatedAt;

        user.activate();

        expect(user.status.toValue()).toBe(UserStatusEnum.ACTIVE);
        expect(user.timestamps.updatedAt).toBe(originalUpdatedAt);
      });
    });

    describe('deactivate', () => {
      it('should deactivate active user', async () => {
        const user = User.random({ status: UserStatus.active() });
        const originalUpdatedAt = user.timestamps.updatedAt;

        await waitForTimestamp();
        user.deactivate();

        expect(user.status.toValue()).toBe(UserStatusEnum.INACTIVE);
        expect(user.timestamps.updatedAt.toValue().getTime()).toBeGreaterThan(originalUpdatedAt.toValue().getTime());
      });

      it('should not update already inactive user', () => {
        const user = User.random({ status: UserStatus.inactive() });
        const originalUpdatedAt = user.timestamps.updatedAt;

        user.deactivate();

        expect(user.status.toValue()).toBe(UserStatusEnum.INACTIVE);
        expect(user.timestamps.updatedAt).toBe(originalUpdatedAt);
      });
    });

    describe('verifyEmail', () => {
      it('should verify pending email', async () => {
        const user = User.random({ status: UserStatus.emailVerificationPending() });
        const originalUpdatedAt = user.timestamps.updatedAt;
        
        await waitForTimestamp();
        user.verifyEmail();

        expect(user.status.toValue()).toBe(UserStatusEnum.ACTIVE);
        expect(user.timestamps.updatedAt.toValue().getTime()).toBeGreaterThan(originalUpdatedAt.toValue().getTime());
      });

      it('should reject verification for non-pending status', () => {
        const statuses = [
          UserStatus.active(),
          UserStatus.inactive(),
        ];

        statuses.forEach(status => {
          const user = User.random({ status });
          expect(() => user.verifyEmail()).toThrow(InvalidOperationException);
        });
      });
    });

    describe('status queries', () => {
      it('should identify active users', () => {
        const activeUser = User.random({ status: UserStatus.active() });
        const inactiveUser = User.random({ status: UserStatus.inactive() });

        expect(activeUser.isActive()).toBe(true);
        expect(inactiveUser.isActive()).toBe(false);
      });

      it('should identify email verification pending', async () => {
        const pendingUser = User.random({ status: UserStatus.emailVerificationPending() });
        const activeUser = User.random({ status: UserStatus.active() });
        const newUser = await createTestUser();

        expect(pendingUser.isEmailVerificationPending()).toBe(true);
        expect(activeUser.isEmailVerificationPending()).toBe(false);
        expect(newUser.isEmailVerificationPending()).toBe(true);
      });
    });
  });

  describe('Role Management', () => {
    it('should check role correctly', () => {
      const adminRole = UserRole.admin();
      const userRole = UserRole.user();
      const user = User.random({ role: adminRole });

      expect(user.hasRole(adminRole)).toBe(true);
      expect(user.hasRole(userRole)).toBe(false);
    });

    it('should change role when different', async () => {
      const user = User.random({ role: UserRole.user() });
      const originalUpdatedAt = user.timestamps.updatedAt;
      const newRole = UserRole.admin();

      await waitForTimestamp();
      user.changeRole(newRole);

      expect(user.hasRole(newRole)).toBe(true);
      expect(user.timestamps.updatedAt.toValue().getTime()).toBeGreaterThan(originalUpdatedAt.toValue().getTime());
    });

    it('should not update when changing to same role', () => {
      const role = UserRole.user();
      const user = User.random({ role });
      const originalUpdatedAt = user.timestamps.updatedAt;

      user.changeRole(role);

      expect(user.role).toBe(role);
      expect(user.timestamps.updatedAt).toBe(originalUpdatedAt);
    });
  });

  describe('Serialization', () => {
    const createTestPrimitives = async (): Promise<UserDTO> => ({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      username: 'testuser',
      password: (await Password.createFromPlainText('testpassword')).toValue(),
      status: UserStatusEnum.ACTIVE,
      role: UserRoleEnum.ADMIN,
      lastLoginAt: new Date('2024-01-01T12:00:00Z'),
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T11:00:00Z'),
    });

    it('should convert to primitives', async () => {
      const user = User.random({
        email: new Email('test@example.com'),
        username: new Username('testuser'),
        role: UserRole.admin(),
        status: UserStatus.active(),
        lastLoginAt: new Date('2024-01-01T12:00:00Z'),
      });

      const value = user.toValue();

      expect(value.id).toBe(user.id.toValue());
      expect(value.email).toBe('test@example.com');
      expect(value.username).toBe('testuser');
      expect(value.password).toMatch(/^\$2[ayb]\$\d{2}\$/); // bcrypt hash
      expect(value.status).toBe(UserStatusEnum.ACTIVE);
      expect(value.role).toBe(UserRoleEnum.ADMIN);
      expect(value.lastLoginAt).toEqual(new Date('2024-01-01T12:00:00Z'));
    });

    it('should recreate from primitives', async () => {
      const primitives = await createTestPrimitives();
      
      const user = User.fromValue(primitives);

      expect(user.id.toValue()).toBe(primitives.id);
      expect(user.email.toValue()).toBe(primitives.email);
      expect(user.username.toValue()).toBe(primitives.username);
      expect(await user.password.verify('testpassword')).toBe(true);
      expect(user.status.toValue()).toBe(primitives.status);
      expect(user.role.toValue()).toBe(primitives.role);
      expect(user.lastLoginAt).toEqual(primitives.lastLoginAt);
    });
  });
});