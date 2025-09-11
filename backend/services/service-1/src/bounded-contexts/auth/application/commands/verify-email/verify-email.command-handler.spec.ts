import { VerifyEmailCommandHandler } from './verify-email.command-handler';
import { VerifyEmailCommand } from './verify-email.command';
import { EmailVerificationInMemoryRepository } from '../../../infrastructure/repositories/in-memory/email-verification-in-memory.repository';
import { EmailVerification } from '../../../domain/entities/email-verification/email-verification.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { EventBus } from '@nestjs/cqrs';
import {
  createEventBusMock,
  NotFoundException,
  MockEventBus,
  InfrastructureException,
} from '@libs/nestjs-common';

describe('VerifyEmailCommandHandler', () => {
  // Test data factory
  const createCommand = (overrides: Partial<VerifyEmailCommand> = {}) => {
    // Default token will be set in tests that need it
    return new VerifyEmailCommand({
      token: 'default-token',
      ...overrides,
    });
  };

  // Setup factory
  const setup = (params: { shouldFailRepository?: boolean; shouldFailEventBus?: boolean } = {}) => {
    const { shouldFailRepository = false, shouldFailEventBus = false } = params;

    const repository = new EmailVerificationInMemoryRepository(shouldFailRepository);
    const eventBus = createEventBusMock({ shouldFail: shouldFailEventBus });
    const commandHandler = new VerifyEmailCommandHandler(
      repository,
      eventBus as unknown as EventBus,
    );

    return { repository, eventBus, commandHandler };
  };

  describe('Happy Path', () => {
    it('should successfully verify email with valid token', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email: new Email('test@example.com'),
      });
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token,
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');

      // Verify the email verification is now verified
      const verifiedEmail = await repository.findByToken(emailVerification.token);
      expect(verifiedEmail).not.toBeNull();
      expect(verifiedEmail!.isVerified).toBe(true);
      expect(verifiedEmail!.isPending()).toBe(false);
    });

    it('should verify email with different token formats', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const emailVerification = EmailVerification.create({
        userId: 'user-456',
        email: new Email('complex.email+tag@sub.domain.com'),
      });
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token,
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-456');

      // Verify the email verification is now verified
      const verifiedEmail = await repository.findByToken(emailVerification.token);
      expect(verifiedEmail).not.toBeNull();
      expect(verifiedEmail!.isVerified).toBe(true);
      expect(verifiedEmail!.email.toValue()).toBe('complex.email+tag@sub.domain.com');
    });

    it('should verify multiple different email verifications independently', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const emailVerification1 = EmailVerification.create({
        userId: 'user-1',
        email: new Email('user1@example.com'),
      });
      const emailVerification2 = EmailVerification.create({
        userId: 'user-2',
        email: new Email('user2@example.com'),
      });
      await repository.save(emailVerification1);
      await repository.save(emailVerification2);

      const command1 = createCommand({
        token: emailVerification1.token,
      });
      const command2 = createCommand({
        token: emailVerification2.token,
      });

      // Act
      const result1 = await commandHandler.execute(command1);
      const result2 = await commandHandler.execute(command2);

      // Assert
      expect(result1.success).toBe(true);
      expect(result1.userId).toBe('user-1');
      expect(result2.success).toBe(true);
      expect(result2.userId).toBe('user-2');

      // Verify both are now verified
      const verified1 = await repository.findByToken(emailVerification1.token);
      const verified2 = await repository.findByToken(emailVerification2.token);
      expect(verified1!.isVerified).toBe(true);
      expect(verified2!.isVerified).toBe(true);
    });

    it('should handle verification of email with special characters', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const emailVerification = EmailVerification.create({
        userId: 'user-special',
        email: new Email('test+special_chars.123@example-domain.co.uk'),
      });
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token,
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-special');

      // Verify the email verification is now verified with correct email
      const verifiedEmail = await repository.findByToken(emailVerification.token);
      expect(verifiedEmail).not.toBeNull();
      expect(verifiedEmail!.isVerified).toBe(true);
      expect(verifiedEmail!.email.toValue()).toBe('test+special_chars.123@example-domain.co.uk');
    });
  });

  describe('Domain Events', () => {
    it('should publish domain events when email is verified', async () => {
      // Arrange
      const { commandHandler, repository, eventBus } = setup();
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email: new Email('test@example.com'),
      });
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token,
      });

      // Act
      await commandHandler.execute(command);

      // Assert - EmailVerifiedDomainEvent should be published
      expect(eventBus.events).toHaveLength(1);
      expect(eventBus.events[0].constructor.name).toBe('EmailVerifiedDomainEvent');
      expect(eventBus.events[0].aggregateId).toBe(emailVerification.id);
    });

    it('should include correct event data when email is verified', async () => {
      // Arrange
      const { commandHandler, repository, eventBus } = setup();
      const emailVerification = EmailVerification.create({
        userId: 'user-456',
        email: new Email('event.test@example.com'),
      });
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token,
      });

      // Act
      await commandHandler.execute(command);

      // Assert - Check event details
      expect(eventBus.events).toHaveLength(1);
      const event = eventBus.events[0];
      expect(event).toMatchObject({
        aggregateId: emailVerification.id,
        userId: 'user-456',
        email: 'event.test@example.com',
      });
    });
  });

  describe('Error Cases', () => {
    it('should throw NotFoundException when token does not exist', async () => {
      // Arrange
      const { commandHandler } = setup();
      const command = createCommand({
        token: 'non-existent-token',
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when token is expired', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email: new Email('test@example.com'),
      });

      // Manually expire the verification
      (emailVerification as any).expiresAt = new Date(Date.now() - 1000);
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token,
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when email is already verified', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email: new Email('test@example.com'),
      });
      emailVerification.verify();
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token,
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should handle repository failures gracefully', async () => {
      // Arrange
      const { commandHandler } = setup({ shouldFailRepository: true });
      const command = createCommand();

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(InfrastructureException);
    });

    it('should handle event bus failures gracefully', async () => {
      // Arrange
      const { commandHandler, repository } = setup({ shouldFailEventBus: true });
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email: new Email('test@example.com'),
      });
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token,
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow('EventBus publishAll failed');
    });

    it('should not verify same email twice', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email: new Email('test@example.com'),
      });
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token,
      });

      // Act - First verification
      const result1 = await commandHandler.execute(command);

      // Assert - First verification succeeds
      expect(result1.success).toBe(true);

      // Act & Assert - Second verification should fail
      await expect(commandHandler.execute(command)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Authorization and Validation', () => {
    it('should authorize all commands by default', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email: new Email('test@example.com'),
      });
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token,
      });

      // Act & Assert - Should not throw authorization error
      const result = await commandHandler.execute(command);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should pass validation for valid commands', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email: new Email('test@example.com'),
      });
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token,
      });

      // Act & Assert - Should not throw validation error
      const result = await commandHandler.execute(command);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle empty token gracefully', async () => {
      // Arrange
      const { commandHandler } = setup();
      const command = createCommand({
        token: '',
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should handle malformed token gracefully', async () => {
      // Arrange
      const { commandHandler } = setup();
      const command = createCommand({
        token: '!!!invalid-token-format!!!',
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should correctly return userId after successful verification', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const emailVerification = EmailVerification.create({
        userId: 'specific-user-id-789',
        email: new Email('test@example.com'),
      });
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token,
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result.userId).toBe('specific-user-id-789');
      expect(result.success).toBe(true);
    });

    it('should handle sequential verification attempts properly', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const emailVerification = EmailVerification.create({
        userId: 'user-sequential',
        email: new Email('sequential@example.com'),
      });
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token,
      });

      // Act - First verification should succeed
      const firstResult = await commandHandler.execute(command);

      // Assert - First succeeds
      expect(firstResult.success).toBe(true);
      expect(firstResult.userId).toBe('user-sequential');

      // Act & Assert - Second verification should fail
      await expect(commandHandler.execute(command)).rejects.toThrow(NotFoundException);

      // Act & Assert - Third verification should also fail
      await expect(commandHandler.execute(command)).rejects.toThrow(NotFoundException);
    });
  });
});
