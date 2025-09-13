import { VerifyEmailCommandHandler } from './verify-email.command-handler';
import { VerifyEmailCommand } from './verify-email.command';
import { EmailVerificationInMemoryRepository } from '../../../infrastructure/repositories/in-memory/email-verification-in-memory.repository';
import { EmailVerification } from '../../../domain/entities/email-verification/email-verification.entity';
import { Email } from '../../../domain/value-objects';
import { EventBus } from '@nestjs/cqrs';
import {
  createEventBusMock,
  NotFoundException,
  InfrastructureException,
  Id,
  DomainValidationException,
} from '@libs/nestjs-common';
import { EmailVerificationVerifiedDomainEvent } from 'src/bounded-contexts/auth/domain/events/email-verified.domain-event';

describe('VerifyEmailCommandHandler', () => {
  // Test data factory
  const createCommand = (props?: {token?: string}) => {
    // Default token will be set in tests that need it
    return new VerifyEmailCommand({
      token: props?.token || Id.random().toValue()
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
      const userId1 = Id.random();
      const { commandHandler, repository } = setup();
      const emailVerification = EmailVerification.create({
        userId: userId1,
        email: new Email('test@example.com'),
      });
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token.toValue(),
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.userId).toBe(userId1.toValue());

      // Verify the email verification is now verified
      const verifiedEmail = await repository.findByToken(emailVerification.token);
      expect(verifiedEmail).not.toBeNull();
      expect(verifiedEmail!.isVerified()).toBe(true);
      expect(verifiedEmail!.isPending()).toBe(false);
    });

    it('should verify email with different token formats', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const emailVerification = EmailVerification.random({
        email: new Email('complex.email+tag@sub.domain.com'),
      });
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token.toValue(),
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.userId).toBe(emailVerification.userId.toValue());

      // Verify the email verification is now verified
      const verifiedEmail = await repository.findByToken(emailVerification.token);
      expect(verifiedEmail).not.toBeNull();
      expect(verifiedEmail!.isVerified()).toBe(true);
      expect(verifiedEmail!.email.toValue()).toBe(emailVerification.email.toValue());
    });

    it('should verify multiple different email verifications independently', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const emailVerification1 = EmailVerification.random()
      const emailVerification2 = EmailVerification.random()
      await repository.save(emailVerification1);
      await repository.save(emailVerification2);

      const command1 = createCommand({
        token: emailVerification1.token.toValue(),
      });
      const command2 = createCommand({
        token: emailVerification2.token.toValue(),
      });

      // Act
      const result1 = await commandHandler.execute(command1);
      const result2 = await commandHandler.execute(command2);

      // Assert
      expect(result1.success).toBe(true);
      expect(result1.userId).toBe(emailVerification1.userId.toValue());
      expect(result2.success).toBe(true);
      expect(result2.userId).toBe(emailVerification2.userId.toValue());

      // Verify both are now verified
      const verified1 = await repository.findByToken(emailVerification1.token);
      const verified2 = await repository.findByToken(emailVerification2.token);
      expect(verified1!.isVerified()).toBe(true);
      expect(verified2!.isVerified()).toBe(true);
    });

    it('should handle verification of email with special characters', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const emailVerification = EmailVerification.random({
        email: new Email('test+special_chars.123@example-domain.co.uk'),
      });
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token.toValue(),
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.userId).toBe(emailVerification.userId.toValue());

      // Verify the email verification is now verified with correct email
      const verifiedEmail = await repository.findByToken(emailVerification.token);
      expect(verifiedEmail).not.toBeNull();
      expect(verifiedEmail!.isVerified()).toBe(true);
      expect(verifiedEmail!.email.toValue()).toBe('test+special_chars.123@example-domain.co.uk');
    });
  });

  describe('Domain Events', () => {
    it('should publish domain events when email is verified', async () => {
      // Arrange
      const userId1 = Id.random();
      const { commandHandler, repository, eventBus } = setup();
      const emailVerification = EmailVerification.create({
        userId: userId1,
        email: new Email('test@example.com'),
      });
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token.toValue(),
      });

      // Act
      await commandHandler.execute(command);

      // Assert - EmailVerificationVerifiedDomainEvent should be published
      expect(eventBus.events).toHaveLength(1);
      const event = eventBus.events[0] as EmailVerificationVerifiedDomainEvent

      expect(event.aggregateId.toValue()).toBe(emailVerification.id.toValue());
      expect(event.userId.toValue()).toBe(emailVerification.userId.toValue());
      expect(event.email.toValue()).toBe(emailVerification.email.toValue());
      expect(event.occurredOn).toBeInstanceOf(Date);
    });
  });

  describe('Error Cases', () => {

    it('should throw DomainValidationException for malformed token gracefully', async () => {
      // Arrange
      const { commandHandler } = setup();
      const command = createCommand({
        token: '!!!invalid-token-format!!!',
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(DomainValidationException);
    });

    it('should throw NotFoundException when token does not exist', async () => {
      // Arrange
      const { commandHandler } = setup();
      const command = createCommand({
        token: Id.random().toValue(),
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when token is expired', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const emailVerification = EmailVerification.random({
        expiresAt: new Date(Date.now() - 1000),
      });
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token.toValue(),
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when email is already verified', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const emailVerification = EmailVerification.random();
      emailVerification.verify();
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token.toValue(),
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
      const emailVerification = EmailVerification.random();
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token.toValue(),
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow('EventBus publishAll failed');
    });

    it('should not verify same email twice', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const emailVerification = EmailVerification.random();
      await repository.save(emailVerification);

      const command = createCommand({
        token: emailVerification.token.toValue(),
      });

      // Act - First verification
      const result1 = await commandHandler.execute(command);

      // Assert - First verification succeeds
      expect(result1.success).toBe(true);

      // Act & Assert - Second verification should fail
      await expect(commandHandler.execute(command)).rejects.toThrow(NotFoundException);
    });
  });
});
