import { CreateEmailVerificationCommandHandler } from './create-email-verification.command-handler';
import { CreateEmailVerificationCommand } from './create-email-verification.command';
import { EmailVerificationInMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/email-verification-in-memory.repository';
import { EventBus } from '@nestjs/cqrs';
import { createEventBusMock, InfrastructureException } from '@libs/nestjs-common';
import { EmailVerificationCreatedDomainEvent } from '@bc/auth/domain/events/email-verification-created.domain-event';
import { Id } from '@libs/nestjs-common';
import { Email, Expiration } from '@bc/auth/domain/value-objects';

describe('CreateEmailVerificationCommandHandler', () => {
  // Test data factory
  const createCommand = ({ userId, email }: { userId?: string; email?: string }) =>
    new CreateEmailVerificationCommand({
      userId: userId || Id.random().toValue(),
      email: email || Email.random().toValue(),
    });

  // Setup factory
  const setup = (params: { shouldFailRepository?: boolean; shouldFailEventBus?: boolean } = {}) => {
    const { shouldFailRepository = false, shouldFailEventBus = false } = params;

    const repository = new EmailVerificationInMemoryRepository(shouldFailRepository);
    const eventBus = createEventBusMock({ shouldFail: shouldFailEventBus });
    const commandHandler = new CreateEmailVerificationCommandHandler(
      repository,
      eventBus as unknown as EventBus,
    );

    return { repository, eventBus, commandHandler };
  };

  describe('Happy Path', () => {
    it('should successfully create email verification with valid data', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const command = createCommand({});

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');

      // Verify email verification was saved
      const savedVerification = await repository.findByUserId(new Id(command.userId));
      expect(savedVerification).not.toBeNull();
      expect(savedVerification!.userId.toValue()).toBe(command.userId);
      expect(savedVerification!.email.toValue()).toBe(command.email);
      expect(savedVerification!.isVerified()).toBe(false);
      expect(savedVerification!.isPending()).toBe(true);
    });

    it('should generate unique IDs for different email verifications', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const command1 = createCommand({});
      const command2 = createCommand({});

      // Act
      const result1 = await commandHandler.execute(command1);
      const result2 = await commandHandler.execute(command2);

      // Assert
      expect(result1.id).not.toBe(result2.id);

      // Verify both were saved
      const verification1 = await repository.findByUserId(new Id(command1.userId));
      const verification2 = await repository.findByUserId(new Id(command2.userId));
      expect(verification1?.userId.toValue()).toBe(command1.userId);
      expect(verification2?.userId.toValue()).toBe(command2.userId);
      expect(verification1?.id).not.toBe(verification2?.id);
    });

    it('should replace existing email verification for same user', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const userId = Id.random().toValue();
      const command1 = createCommand({
        userId: userId,
      });
      const command2 = createCommand({
        userId: userId,
      });

      // Act
      const result1 = await commandHandler.execute(command1);
      const result2 = await commandHandler.execute(command2);

      // Assert - Both commands should succeed
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.id).not.toBe(result2.id);

      // Verify only the second one exists for the user
      const verification = await repository.findByUserId(new Id(userId));
      expect(verification).not.toBeNull();
      expect(verification!.id.toValue()).toBe(result2.id);
      expect(verification!.email.toValue()).not.toBe(command1.email);
      expect(verification!.email.toValue()).toBe(command2.email);

      // Verify the first one was removed
      const firstVerificationExists = await repository.exists(new Id(result1.id));
      expect(firstVerificationExists).toBe(false);
    });

    it('should set expiration date 24 hours from creation', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const command = createCommand({});

      // Act
      await commandHandler.execute(command);

      // Assert
      const verification = await repository.findByUserId(new Id(command.userId));
      expect(verification).not.toBeNull();

      const expectedExpiration = Expiration.atHoursFromNow(24);
      const actualExpiration = verification!.expiration;

      // Allow for small time differences in test execution  
      expect(actualExpiration.isWithinTolerance(expectedExpiration.toValue(), 5000)).toBe(true);
    });
  });

  describe('Domain Events', () => {
    it('should publish EmailVerificationCreatedDomainEvent', async () => {
      // Arrange
      const { commandHandler, eventBus } = setup();
      const command = createCommand({});

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(eventBus.events).toHaveLength(1);
      const event = eventBus.events[0] as EmailVerificationCreatedDomainEvent;
      expect(event).toBeInstanceOf(EmailVerificationCreatedDomainEvent);
      expect(event.aggregateId.toValue()).toBe(result.id);
      expect(event.userId.toValue()).toBe(command.userId);
      expect(event.email.toValue()).toBe(command.email);
      expect(event.occurredOn).toBeInstanceOf(Date);
      expect(event.expiration).toBeInstanceOf(Expiration);
    });
  });

  describe('Error Cases', () => {
    it('should handle repository failures gracefully', async () => {
      // Arrange
      const { commandHandler } = setup({ shouldFailRepository: true });
      const command = createCommand({});

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(InfrastructureException);
    });

    it('should handle event bus failures gracefully', async () => {
      // Arrange
      const { commandHandler } = setup({ shouldFailEventBus: true });
      const command = createCommand({});

      // Act & Assert
      // Since domain events are sent during command execution, this should fail
      await expect(commandHandler.execute(command)).rejects.toThrow('EventBus publishAll failed');
    });
  });
});
