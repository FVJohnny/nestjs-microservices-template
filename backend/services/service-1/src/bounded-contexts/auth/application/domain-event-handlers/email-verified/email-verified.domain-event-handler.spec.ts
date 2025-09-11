import { EmailVerifiedDomainEventHandler } from './email-verified.domain-event-handler';
import {
  EmailVerifiedDomainEvent,
  EmailVerifiedDomainEventProps,
} from '../../../domain/events/email-verified.domain-event';
import { Email, Username, Password, UserRole } from '../../../domain/value-objects';
import { UserInMemoryRepository } from '../../../infrastructure/repositories/in-memory/user-in-memory.repository';
import { User } from '../../../domain/entities/user/user.entity';
import {
  NotFoundException,
  InvalidOperationException,
  InfrastructureException,
} from '@libs/nestjs-common';

describe('EmailVerifiedDomainEventHandler', () => {
  // Test data factory
  const createEvent = (overrides: Partial<EmailVerifiedDomainEventProps> = {}) =>
    new EmailVerifiedDomainEvent({
      emailVerificationId: 'verification-123',
      userId: 'test-user-123',
      email: 'test@example.com',
      ...overrides,
    });

  // Setup factory
  const setup = (params: { shouldFailRepository?: boolean } = {}) => {
    const { shouldFailRepository = false } = params;

    const userRepository = new UserInMemoryRepository(shouldFailRepository);
    const eventHandler = new EmailVerifiedDomainEventHandler(userRepository);

    return { userRepository, eventHandler };
  };

  describe('Happy Path', () => {
    it('should handle EmailVerifiedDomainEvent and mark user email as verified', async () => {
      // Arrange
      const { eventHandler, userRepository } = setup();
      const user = User.create({
        email: new Email('test@example.com'),
        username: new Username('testuser'),
        password: await Password.createFromPlainText('TestPassword123!'),
        role: UserRole.user(),
      });
      await userRepository.save(user);

      const event = createEvent({
        userId: user.id,
      });

      // Act
      await eventHandler.handle(event);

      // Assert
      const updatedUser = await userRepository.findById(user.id);
      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.isActive()).toBe(true);
    });

    it('should handle multiple email verification events for different users', async () => {
      // Arrange
      const { eventHandler, userRepository } = setup();
      const user1 = User.create({
        email: new Email('user1@example.com'),
        username: new Username('user1'),
        password: await Password.createFromPlainText('TestPassword123!'),
        role: UserRole.user(),
      });
      const user2 = User.create({
        email: new Email('user2@example.com'),
        username: new Username('user2'),
        password: await Password.createFromPlainText('TestPassword123!'),
        role: UserRole.user(),
      });
      await userRepository.save(user1);
      await userRepository.save(user2);

      const event1 = createEvent({
        emailVerificationId: 'verification-1',
        userId: user1.id,
        email: 'user1@example.com',
      });
      const event2 = createEvent({
        emailVerificationId: 'verification-2',
        userId: user2.id,
        email: 'user2@example.com',
      });

      // Act
      await eventHandler.handle(event1);
      await eventHandler.handle(event2);

      // Assert
      const updatedUser1 = await userRepository.findById(user1.id);
      const updatedUser2 = await userRepository.findById(user2.id);

      expect(updatedUser1!.isActive()).toBe(true);
      expect(updatedUser2!.isActive()).toBe(true);
    });

    it('should handle email verification for user with special characters in email', async () => {
      // Arrange
      const { eventHandler, userRepository } = setup();
      const specialEmail = 'test.user+tag@sub.domain-name.com';
      const user = User.create({
        email: new Email(specialEmail),
        username: new Username('specialuser'),
        password: await Password.createFromPlainText('TestPassword123!'),
        role: UserRole.user(),
      });
      await userRepository.save(user);

      const event = createEvent({
        userId: user.id,
        email: specialEmail,
      });

      // Act
      await eventHandler.handle(event);

      // Assert
      const updatedUser = await userRepository.findById(user.id);
      expect(updatedUser!.isActive()).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      const { eventHandler } = setup();
      const event = createEvent({
        userId: 'non-existent-user',
      });

      // Act & Assert
      await expect(eventHandler.handle(event)).rejects.toThrow(NotFoundException);
    });

    it('should handle repository findById failure', async () => {
      // Arrange
      const { eventHandler } = setup({ shouldFailRepository: true });
      const event = createEvent();

      // Act & Assert
      await expect(eventHandler.handle(event)).rejects.toThrow(InfrastructureException);
    });

    it('should handle repository save failure', async () => {
      // Arrange
      const user = User.create({
        email: new Email('test@example.com'),
        username: new Username('testuser'),
        password: await Password.createFromPlainText('TestPassword123!'),
        role: UserRole.user(),
      });

      const failingRepository = {
        findById: jest.fn().mockResolvedValue(user),
        save: jest.fn().mockRejectedValue(new Error('Save operation failed')),
        findByEmail: jest.fn(),
        findByUsername: jest.fn(),
        existsByEmail: jest.fn(),
        existsByUsername: jest.fn(),
        findAll: jest.fn(),
        findByCriteria: jest.fn(),
        countByCriteria: jest.fn(),
        remove: jest.fn(),
        exists: jest.fn(),
      } as any;

      const failingHandler = new EmailVerifiedDomainEventHandler(failingRepository);
      const event = createEvent({
        userId: user.id,
      });

      // Act & Assert
      await expect(failingHandler.handle(event)).rejects.toThrow('Save operation failed');
    });
  });

  describe('Business Logic Edge Cases', () => {
    it('should throw error when trying to verify already active user', async () => {
      // Arrange
      const { eventHandler, userRepository } = setup();
      const user = User.create({
        email: new Email('test@example.com'),
        username: new Username('testuser'),
        password: await Password.createFromPlainText('TestPassword123!'),
        role: UserRole.user(),
      });

      // Manually verify email first
      user.verifyEmail();
      await userRepository.save(user);

      const event = createEvent({
        userId: user.id,
      });

      // Act & Assert
      await expect(eventHandler.handle(event)).rejects.toThrow(InvalidOperationException);
    });

    it('should handle concurrent email verification events', async () => {
      // Arrange
      const { eventHandler, userRepository } = setup();
      const user = User.create({
        email: new Email('test@example.com'),
        username: new Username('testuser'),
        password: await Password.createFromPlainText('TestPassword123!'),
        role: UserRole.user(),
      });
      await userRepository.save(user);

      const event1 = createEvent({
        emailVerificationId: 'verification-1',
        userId: user.id,
      });
      const event2 = createEvent({
        emailVerificationId: 'verification-2',
        userId: user.id,
      });

      // Act - Process events concurrently
      await Promise.all([eventHandler.handle(event1), eventHandler.handle(event2)]);

      // Assert
      const updatedUser = await userRepository.findById(user.id);
      expect(updatedUser!.isActive()).toBe(true);
    });

    it('should handle invalid user IDs gracefully', async () => {
      // Arrange
      const { eventHandler } = setup();
      const event = createEvent({
        userId: '', // Empty user ID
      });

      // Act & Assert
      await expect(eventHandler.handle(event)).rejects.toThrow(NotFoundException);
    });
  });
});
