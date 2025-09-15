import { VerifyEmailCommandHandler } from './verify-email.command-handler';
import { VerifyEmailCommand } from './verify-email.command';
import { EmailVerificationInMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/email-verification-in-memory.repository';
import { EmailVerification } from '@bc/auth/domain/entities/email-verification/email-verification.entity';
import { Expiration } from '@bc/auth/domain/value-objects';
import { EventBus } from '@nestjs/cqrs';
import {
  createEventBusMock,
  NotFoundException,
  InfrastructureException,
  Id,
  DomainValidationException,
  InvalidOperationException,
  ApplicationException,
} from '@libs/nestjs-common';
import { EmailVerificationVerifiedDomainEvent } from 'src/bounded-contexts/auth/domain/events/email-verified.domain-event';

describe('VerifyEmailCommandHandler', () => {
  // Test data factory
  const createCommand = (props?: { emailVerificationId?: string }) => {
    return new VerifyEmailCommand({
      emailVerificationId: props?.emailVerificationId || Id.random().toValue(),
    });
  };

  // Setup factory
  const setup = async (
    params: {
      withEmailVerification?: boolean;
      type?: 'pending' | 'expired' | 'verified';
      shouldFailRepository?: boolean;
      shouldFailEventBus?: boolean;
    } = {},
  ) => {
    const {
      withEmailVerification = false,
      type = 'pending',
      shouldFailRepository = false,
      shouldFailEventBus = false,
    } = params;

    const repository = new EmailVerificationInMemoryRepository(shouldFailRepository);
    const eventBus = createEventBusMock({ shouldFail: shouldFailEventBus });
    const commandHandler = new VerifyEmailCommandHandler(
      repository,
      eventBus as unknown as EventBus,
    );

    let emailVerification: EmailVerification | null = null;
    if (withEmailVerification) {
      emailVerification = EmailVerification.random({
        expiration: Expiration.atHoursFromNow(type === 'expired' ? -1 : 24),
      });

      if (type === 'verified') {
        emailVerification.verify();
      }

      await repository.save(emailVerification);
    }

    return { repository, eventBus, commandHandler, emailVerification };
  };

  describe('Happy Path', () => {
    it('should successfully verify email with valid ID', async () => {
      // Arrange
      const { commandHandler, repository, emailVerification } = await setup({
        withEmailVerification: true,
        type: 'pending',
      });
      const command = createCommand({
        emailVerificationId: emailVerification!.id.toValue(),
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe(emailVerification!.userId.toValue());

      // Verify the email verification is now verified
      const verifiedEmail = await repository.findById(emailVerification!.id);
      expect(verifiedEmail).not.toBeNull();
      expect(verifiedEmail!.isVerified()).toBe(true);
      expect(verifiedEmail!.isPending()).toBe(false);
    });
  });

  describe('Domain Events', () => {
    it('should publish domain events when email is verified', async () => {
      // Arrange
      const { commandHandler, eventBus, emailVerification } = await setup({
        withEmailVerification: true,
        type: 'pending',
      });
      const command = createCommand({
        emailVerificationId: emailVerification!.id.toValue(),
      });

      // Act
      await commandHandler.execute(command);

      // Assert
      expect(eventBus.events).toHaveLength(1);
      const event = eventBus.events[0] as EmailVerificationVerifiedDomainEvent;

      expect(event.aggregateId.toValue()).toBe(emailVerification!.id.toValue());
      expect(event.userId.toValue()).toBe(emailVerification!.userId.toValue());
      expect(event.email.toValue()).toBe(emailVerification!.email.toValue());
      expect(event.occurredOn).toBeInstanceOf(Date);
    });
  });

  describe('Error Cases', () => {
    it('should throw DomainValidationException for malformed ID', async () => {
      // Arrange
      const { commandHandler } = await setup();
      const command = createCommand({
        emailVerificationId: '!!!invalid-id-format!!!',
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(DomainValidationException);
    });

    it('should throw NotFoundException when ID does not exist', async () => {
      // Arrange
      const { commandHandler } = await setup();
      const command = createCommand();

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw InvalidOperationException when email verification is expired', async () => {
      // Arrange
      const { commandHandler, emailVerification } = await setup({
        withEmailVerification: true,
        type: 'expired',
      });
      const command = createCommand({
        emailVerificationId: emailVerification!.id.toValue(),
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(InvalidOperationException);
    });

    it('should throw InvalidOperationException when email is already verified', async () => {
      // Arrange
      const { commandHandler, emailVerification } = await setup({
        withEmailVerification: true,
        type: 'verified',
      });
      const command = createCommand({
        emailVerificationId: emailVerification!.id.toValue(),
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(InvalidOperationException);
    });

    it('should throw InfrastructureException when repository fails', async () => {
      // Arrange
      const { commandHandler } = await setup({ shouldFailRepository: true });
      const command = createCommand();

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(InfrastructureException);
    });

    it('should propagate event bus exceptions', async () => {
      // Arrange
      const { commandHandler, emailVerification } = await setup({
        withEmailVerification: true,
        shouldFailEventBus: true,
      });
      const command = createCommand({
        emailVerificationId: emailVerification!.id.toValue(),
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(ApplicationException);
    });
  });
});
