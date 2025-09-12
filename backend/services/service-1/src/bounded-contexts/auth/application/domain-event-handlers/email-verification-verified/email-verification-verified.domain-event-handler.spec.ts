import { EmailVerificationVerifiedDomainEventHandler } from './email-verification-verified.domain-event-handler';
import {
  EmailVerificationVerifiedDomainEvent,
  EmailVerificationVerifiedDomainEventProps,
} from '../../../domain/events/email-verified.domain-event';
import { Email, UserStatus } from '../../../domain/value-objects';
import { UserInMemoryRepository } from '../../../infrastructure/repositories/in-memory/user-in-memory.repository';
import { User } from '../../../domain/entities/user/user.entity';
import {
  NotFoundException,
  InvalidOperationException,
  InfrastructureException,
} from '@libs/nestjs-common';

describe('EmailVerificationVerifiedDomainEventHandler', () => {
  // Test data factory
  const createEvent = (overrides: Partial<EmailVerificationVerifiedDomainEventProps> = {}) =>
    new EmailVerificationVerifiedDomainEvent({
      emailVerificationId: 'verification-123',
      userId: 'test-user-123',
      email: 'test@example.com',
      ...overrides,
    });

  const createEventFromUser = (user: User) =>
    new EmailVerificationVerifiedDomainEvent({
      emailVerificationId: 'verification-123',
      userId: user.id,
      email: user.email.toValue(),
    });

  // Setup factory
  const setup = (params: { shouldFailRepository?: boolean } = {}) => {
    const { shouldFailRepository = false } = params;

    const userRepository = new UserInMemoryRepository(shouldFailRepository);
    const eventHandler = new EmailVerificationVerifiedDomainEventHandler(userRepository);

    return { userRepository, eventHandler };
  };

  describe('Happy Path', () => {
    it('should handle EmailVerificationVerifiedDomainEvent and set user status as active', async () => {
      // Arrange
      const { eventHandler, userRepository } = setup();
      const user = User.random({ status: UserStatus.emailVerificationPending() });
      await userRepository.save(user);

      const event = createEventFromUser(user);

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
      const user1 = User.random({ status: UserStatus.emailVerificationPending() });
      const user2 = User.random({ status: UserStatus.emailVerificationPending() });
      await userRepository.save(user1);
      await userRepository.save(user2);

      const event1 = createEventFromUser(user1);
      const event2 = createEventFromUser(user2);

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
      const user = User.random({
        email: new Email('test.user+tag@sub.domain-name.com'),
        status: UserStatus.emailVerificationPending(),
      });
      await userRepository.save(user);

      const event = createEventFromUser(user);

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

    it('should handle repository failure', async () => {
      // Arrange
      const { eventHandler } = setup({ shouldFailRepository: true });
      const user = User.random({ status: UserStatus.emailVerificationPending() });
      const event = createEventFromUser(user);

      // Act & Assert
      await expect(eventHandler.handle(event)).rejects.toThrow(InfrastructureException);
    });
  });

  describe('Business Logic Edge Cases', () => {
    it('should throw error when trying to verify already active user', async () => {
      // Arrange
      const { eventHandler, userRepository } = setup();
      const user = User.random({ status: UserStatus.active() });
      await userRepository.save(user);

      const event = createEventFromUser(user);

      // Act & Assert
      await expect(eventHandler.handle(event)).rejects.toThrow(InvalidOperationException);
    });

    it('should handle concurrent email verification events', async () => {
      // Arrange
      const { eventHandler, userRepository } = setup();
      const user = User.random({ status: UserStatus.emailVerificationPending() });
      await userRepository.save(user);

      const event1 = createEventFromUser(user);
      const event2 = createEventFromUser(user);

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
