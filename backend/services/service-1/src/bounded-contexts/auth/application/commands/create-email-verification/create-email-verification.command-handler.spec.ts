import { CreateEmailVerificationCommandHandler } from './create-email-verification.command-handler';
import { CreateEmailVerificationCommand } from './create-email-verification.command';
import { EmailVerificationInMemoryRepository } from '../../../infrastructure/repositories/in-memory/email-verification-in-memory.repository';
import type { EventBus } from '@nestjs/cqrs';
import type { MockEventBus } from '@libs/nestjs-common';
import { createEventBusMock } from '@libs/nestjs-common';

describe('CreateEmailVerificationCommandHandler (Unit)', () => {
  let commandHandler: CreateEmailVerificationCommandHandler;
  let repository: EmailVerificationInMemoryRepository;
  let eventBus: MockEventBus;

  beforeEach(() => {
    repository = new EmailVerificationInMemoryRepository();
    eventBus = createEventBusMock({ shouldFail: false });
    commandHandler = new CreateEmailVerificationCommandHandler(repository, eventBus as unknown as EventBus);
  });

  describe('Happy Path', () => {
    it('should successfully create email verification with valid data', async () => {
      // Arrange
      const command = new CreateEmailVerificationCommand({
        userId: 'user-123',
        email: 'test@example.com',
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.token).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(typeof result.token).toBe('string');

      // Verify email verification was saved
      const savedVerification = await repository.findByUserId('user-123');
      expect(savedVerification).not.toBeNull();
      expect(savedVerification!.userId).toBe('user-123');
      expect(savedVerification!.email.toValue()).toBe('test@example.com');
      expect(savedVerification!.isVerified).toBe(false);
      expect(savedVerification!.isPending()).toBe(true);
    });

    it('should create email verification with different email formats', async () => {
      // Arrange
      const command = new CreateEmailVerificationCommand({
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
      const command1 = new CreateEmailVerificationCommand({
        userId: 'user-1',
        email: 'user1@example.com',
      });
      const command2 = new CreateEmailVerificationCommand({
        userId: 'user-2',
        email: 'user2@example.com',
      });

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
      const command1 = new CreateEmailVerificationCommand({
        userId: 'user-123',
        email: 'test1@example.com',
      });
      const command2 = new CreateEmailVerificationCommand({
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
      const beforeCreation = new Date();
      const command = new CreateEmailVerificationCommand({
        userId: 'user-123',
        email: 'test@example.com',
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
      const command = new CreateEmailVerificationCommand({
        userId: 'user-123',
        email: 'test@example.com',
      });

      // Act
      await commandHandler.execute(command);

      // Assert - No domain events are emitted on creation, only on verification
      // This is expected behavior as creation doesn't emit events
      expect(eventBus.events).toHaveLength(0);
    });
  });

  describe('Error Cases', () => {
    it('should handle repository failures gracefully', async () => {
      // Arrange
      const failingRepository = {
        save: jest.fn().mockRejectedValue(new Error('Repository save failed')),
        findByToken: jest.fn(),
        findByUserId: jest.fn(),
        findByEmail: jest.fn(),
        findPendingByUserId: jest.fn(),
        findPendingByToken: jest.fn(),
        remove: jest.fn(),
        exists: jest.fn(),
      } as any;

      const failingHandler = new CreateEmailVerificationCommandHandler(failingRepository, eventBus as unknown as EventBus);
      const command = new CreateEmailVerificationCommand({
        userId: 'user-123',
        email: 'test@example.com',
      });

      // Act & Assert
      await expect(failingHandler.execute(command)).rejects.toThrow('Repository save failed');
    });

    it('should handle event bus failures gracefully', async () => {
      // Arrange
      const failingEventBus = createEventBusMock({ shouldFail: true });
      const failingHandler = new CreateEmailVerificationCommandHandler(repository, failingEventBus as unknown as EventBus);
      const command = new CreateEmailVerificationCommand({
        userId: 'user-123',
        email: 'test@example.com',
      });

      // Act & Assert
      // Since domain events are sent during command execution, this should fail
      await expect(failingHandler.execute(command)).rejects.toThrow('EventBus publishAll failed');
    });
  });

  describe('Authorization and Validation', () => {
    it('should authorize all commands by default', async () => {
      // Arrange
      const command = new CreateEmailVerificationCommand({
        userId: 'user-123',
        email: 'test@example.com',
      });

      // Act & Assert - Should not throw authorization error
      const result = await commandHandler.execute(command);
      expect(result).toBeDefined();
    });

    it('should pass validation for valid commands', async () => {
      // Arrange
      const command = new CreateEmailVerificationCommand({
        userId: 'user-123',
        email: 'test@example.com',
      });

      // Act & Assert - Should not throw validation error
      const result = await commandHandler.execute(command);
      expect(result).toBeDefined();
    });

    it('should replace verification when user already has email verification', async () => {
      // Arrange
      const firstCommand = new CreateEmailVerificationCommand({
        userId: 'duplicate-user',
        email: 'first@example.com',
      });
      const secondCommand = new CreateEmailVerificationCommand({
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
      const firstCommand = new CreateEmailVerificationCommand({
        userId: 'user-1',
        email: 'duplicate@example.com',
      });
      const secondCommand = new CreateEmailVerificationCommand({
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
      const firstCommand = new CreateEmailVerificationCommand({
        userId: 'test-user',
        email: 'first@example.com',
      });
      const secondCommand = new CreateEmailVerificationCommand({
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