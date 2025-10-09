import { EmailVerificationVerified_UpdateUserStatus_DomainEventHandler } from './email-verification-verified_update-user-status.domain-event-handler';
import { EmailVerificationVerified_DomainEvent } from '@bc/auth/domain/aggregates/email-verification/events/email-verified.domain-event';
import { Email, UserStatus } from '@bc/auth/domain/value-objects';
import { User_InMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user.in-memory-repository';
import { User } from '@bc/auth/domain/aggregates/user/user.aggregate';
import {
  NotFoundException,
  InvalidOperationException,
  InfrastructureException,
  Id,
} from '@libs/nestjs-common';

describe('EmailVerificationVerified_UpdateUserStatus_DomainEventHandler', () => {
  // Test data factory
  const createEvent = () =>
    new EmailVerificationVerified_DomainEvent(Id.random(), Id.random(), Email.random());

  const createEventFromUser = (user: User) =>
    new EmailVerificationVerified_DomainEvent(user.id, user.id, user.email);

  // Setup factory
  const setup = (params: { shouldFailRepository?: boolean } = {}) => {
    const { shouldFailRepository = false } = params;

    const userRepository = new User_InMemoryRepository(shouldFailRepository);
    const eventHandler = new EmailVerificationVerified_UpdateUserStatus_DomainEventHandler(
      userRepository,
    );

    return { userRepository, eventHandler };
  };

  describe('Happy Path', () => {
    it('should set user status to active', async () => {
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
      const event = createEvent();

      // Act & Assert
      await expect(eventHandler.handle(event)).rejects.toThrow(NotFoundException);
    });

    it('should handle repository failure', async () => {
      // Arrange
      const { eventHandler } = setup({ shouldFailRepository: true });
      const event = createEvent();

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
  });
});
