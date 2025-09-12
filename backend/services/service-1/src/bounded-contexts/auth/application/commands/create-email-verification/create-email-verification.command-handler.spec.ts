import { CreateEmailVerificationCommandHandler } from './create-email-verification.command-handler';
import { CreateEmailVerificationCommand } from './create-email-verification.command';
import { EmailVerificationInMemoryRepository } from '../../../infrastructure/repositories/in-memory/email-verification-in-memory.repository';
import { EventBus } from '@nestjs/cqrs';
import { createEventBusMock, InfrastructureException, MockEventBus } from '@libs/nestjs-common';
import { EmailVerificationCreatedDomainEvent } from '../../../domain/events/email-verification-created.domain-event';

describe('CreateEmailVerificationCommandHandler', () => {
  // Test data factory
  const createCommand = (overrides: Partial<CreateEmailVerificationCommand> = {}) =>
    new CreateEmailVerificationCommand({
      userId: 'test-user-123',
      email: 'test@example.com',
      ...overrides,
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
      const command = createCommand();

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.token).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(typeof result.token).toBe('string');

      // Verify email verification was saved
      const savedVerification = await repository.findByUserId('test-user-123');
      expect(savedVerification).not.toBeNull();
      expect(savedVerification!.userId).toBe('test-user-123');
      expect(savedVerification!.email.toValue()).toBe('test@example.com');
      expect(savedVerification!.isVerified).toBe(false);
      expect(savedVerification!.isPending()).toBe(true);
    });

    it('should create email verification with different email formats', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const command = createCommand({
        userId: 'user-456',
        email: 'complex.email+tag@sub.domain.com',
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.token).toBeDefined();

      // Verify email verification was saved with correct email
      const savedVerification = await repository.findByUserId('user-456');
      expect(savedVerification).not.toBeNull();
      expect(savedVerification!.email.toValue()).toBe('complex.email+tag@sub.domain.com');
    });

    it('should generate unique tokens for different email verifications', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const command1 = createCommand({ userId: 'user-1', email: 'user1@example.com' });
      const command2 = createCommand({ userId: 'user-2', email: 'user2@example.com' });

      // Act
      const result1 = await commandHandler.execute(command1);
      const result2 = await commandHandler.execute(command2);

      // Assert
      expect(result1.token).not.toBe(result2.token);
      expect(result1.id).not.toBe(result2.id);

      // Verify both were saved
      const verification1 = await repository.findByUserId('user-1');
      const verification2 = await repository.findByUserId('user-2');
      expect(verification1).not.toBeNull();
      expect(verification2).not.toBeNull();
      expect(verification1!.token).not.toBe(verification2!.token);
    });

    it('should replace existing email verification for same user', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const command1 = createCommand({
        userId: 'user-123',
        email: 'test1@example.com',
      });
      const command2 = createCommand({
        userId: 'user-123',
        email: 'test2@example.com',
      });

      // Act
      const result1 = await commandHandler.execute(command1);
      const result2 = await commandHandler.execute(command2);

      // Assert - Both commands should succeed
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.id).not.toBe(result2.id);

      // Verify only the second one exists for the user
      const verification = await repository.findByUserId('user-123');
      expect(verification).not.toBeNull();
      expect(verification!.id).toBe(result2.id);
      expect(verification!.email.toValue()).toBe('test2@example.com');

      // Verify the first one was removed
      const firstVerificationExists = await repository.exists(result1.id);
      expect(firstVerificationExists).toBe(false);
    });

    it('should set expiration date 24 hours from creation', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const beforeCreation = new Date();
      const command = createCommand({
        userId: 'user-123',
      });

      // Act
      await commandHandler.execute(command);

      // Assert
      const verification = await repository.findByUserId('user-123');
      expect(verification).not.toBeNull();

      const expectedExpiration = new Date(beforeCreation.getTime() + 24 * 60 * 60 * 1000);
      const actualExpiration = verification!.expiresAt;

      // Allow for small time differences in test execution
      const timeDiff = Math.abs(actualExpiration.getTime() - expectedExpiration.getTime());
      expect(timeDiff).toBeLessThan(5000); // 5 seconds tolerance
    });
  });

  describe('Domain Events', () => {
    it('should publish domain events when email verification is created', async () => {
      // Arrange
      const { commandHandler, eventBus } = setup();
      const command = createCommand();

      // Act
      await commandHandler.execute(command);

      // Assert - No domain events are emitted on creation, only on verification
      // This is expected behavior as creation doesn't emit events
      expect(eventBus.events).toHaveLength(1);
      const event = eventBus.events[0] as EmailVerificationCreatedDomainEvent;
      expect(event).toBeInstanceOf(EmailVerificationCreatedDomainEvent);
      expect(event.aggregateId).toBeDefined();
      expect(event.userId).toBe(command.userId);
      expect(event.email).toBe(command.email);
      expect(event.occurredOn).toBeInstanceOf(Date);
      expect(event.token).toBeDefined();
      expect(event.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('Error Cases', () => {
    it('should handle repository failures gracefully', async () => {
      // Arrange
      const { commandHandler } = setup({ shouldFailRepository: true });
      const command = createCommand();

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(InfrastructureException);
    });

    it('should handle event bus failures gracefully', async () => {
      // Arrange
      const { commandHandler } = setup({ shouldFailEventBus: true });
      const command = createCommand();

      // Act & Assert
      // Since domain events are sent during command execution, this should fail
      await expect(commandHandler.execute(command)).rejects.toThrow('EventBus publishAll failed');
    });
  });

  describe('Authorization and Validation', () => {
    it('should authorize all commands by default', async () => {
      // Arrange
      const { commandHandler } = setup();
      const command = createCommand();

      // Act & Assert - Should not throw authorization error
      const result = await commandHandler.execute(command);
      expect(result).toBeDefined();
    });

    it('should pass validation for valid commands', async () => {
      // Arrange
      const { commandHandler } = setup();
      const command = createCommand();

      // Act & Assert - Should not throw validation error
      const result = await commandHandler.execute(command);
      expect(result).toBeDefined();
    });

    it('should replace verification when user already has email verification', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const firstCommand = createCommand({
        userId: 'duplicate-user',
        email: 'first@example.com',
      });
      const secondCommand = createCommand({
        userId: 'duplicate-user',
        email: 'second@example.com',
      });

      // Act - Create first verification
      const result1 = await commandHandler.execute(firstCommand);
      const result2 = await commandHandler.execute(secondCommand);

      // Assert - Both should succeed with different IDs
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.id).not.toBe(result2.id);

      // Verify only the second verification exists
      const verification = await repository.findByUserId('duplicate-user');
      expect(verification).not.toBeNull();
      expect(verification!.id).toBe(result2.id);
      expect(verification!.email.toValue()).toBe('second@example.com');
    });

    it('should replace verification when email is already used by another user', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const firstCommand = createCommand({
        userId: 'user-1',
        email: 'duplicate@example.com',
      });
      const secondCommand = createCommand({
        userId: 'user-2',
        email: 'duplicate@example.com',
      });

      // Act - Create first verification
      const result1 = await commandHandler.execute(firstCommand);
      const result2 = await commandHandler.execute(secondCommand);

      // Assert - Both should succeed with different IDs
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.id).not.toBe(result2.id);

      // Verify only the second verification exists (first one removed)
      const verification1 = await repository.findByUserId('user-1');
      const verification2 = await repository.findByUserId('user-2');

      expect(verification1).toBeNull();
      expect(verification2).not.toBeNull();
      expect(verification2!.id).toBe(result2.id);
      expect(verification2!.email.toValue()).toBe('duplicate@example.com');
    });

    it('should automatically replace verification when creating new one for same user with different email', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const firstCommand = createCommand({
        userId: 'test-user',
        email: 'first@example.com',
      });
      const secondCommand = createCommand({
        userId: 'test-user',
        email: 'second@example.com',
      });

      // Act - Create first verification
      const firstResult = await commandHandler.execute(firstCommand);

      // Create second verification (should automatically replace the first)
      const secondResult = await commandHandler.execute(secondCommand);

      // Assert
      expect(secondResult).toBeDefined();
      expect(secondResult.id).not.toBe(firstResult.id);

      // Verify only the second verification exists
      const verification = await repository.findByUserId('test-user');
      expect(verification).not.toBeNull();
      expect(verification!.id).toBe(secondResult.id);
      expect(verification!.email.toValue()).toBe('second@example.com');

      // Verify the first verification was removed
      const firstVerificationExists = await repository.exists(firstResult.id);
      expect(firstVerificationExists).toBe(false);
    });
  });
});
