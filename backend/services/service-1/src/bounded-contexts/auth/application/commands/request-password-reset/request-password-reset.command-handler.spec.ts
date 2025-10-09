import { RequestPasswordReset_CommandHandler } from './request-password-reset.command-handler';
import { RequestPasswordReset_Command } from './request-password-reset.command';
import { User_InMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user.in-memory-repository';
import { PasswordReset_InMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/password-reset.in-memory-repository';
import { User } from '@bc/auth/domain/aggregates/user/user.aggregate';
import { PasswordReset } from '@bc/auth/domain/aggregates/password-reset/password-reset.aggregate';
import { Email, Username, Password, Expiration, Used } from '@bc/auth/domain/value-objects';
import {
  ApplicationException,
  DateVO,
  InfrastructureException,
  MockEventBus,
  PasswordResetRequested_IntegrationEvent,
  wait,
  Outbox_InMemoryRepository,
  Id,
} from '@libs/nestjs-common';
import { PasswordResetRequested_DomainEvent } from '@bc/auth/domain/aggregates/password-reset/events/password-reset-requested.domain-event';

describe('RequestPasswordResetCommandHandler', () => {
  // Test data factory
  const createCommand = (props?: Partial<RequestPasswordReset_Command>) =>
    new RequestPasswordReset_Command({
      email: props?.email || Email.random().toValue(),
    });

  const createUser = async (userRepository: User_InMemoryRepository, email?: Email) => {
    const user = User.create({
      email: email || Email.random(),
      username: Username.random(),
      password: await Password.createFromPlainText('password123'),
    });
    await userRepository.save(user);
    return user;
  };

  // Setup factory
  const setup = (
    params: {
      shouldFailPasswordResetRepository?: boolean;
      shouldFailUserRepository?: boolean;
      shouldFailEventBus?: boolean;
      shouldFailOutbox?: boolean;
    } = {},
  ) => {
    const {
      shouldFailPasswordResetRepository = false,
      shouldFailUserRepository = false,
      shouldFailEventBus = false,
      shouldFailOutbox = false,
    } = params;

    const outboxRepository = new Outbox_InMemoryRepository(shouldFailOutbox);
    const userRepository = new User_InMemoryRepository(shouldFailUserRepository);
    const passwordResetRepository = new PasswordReset_InMemoryRepository(
      shouldFailPasswordResetRepository,
    );
    const eventBus = new MockEventBus({ shouldFail: shouldFailEventBus });
    const commandHandler = new RequestPasswordReset_CommandHandler(
      userRepository,
      passwordResetRepository,
      outboxRepository,
      eventBus,
    );

    return {
      userRepository,
      passwordResetRepository,
      eventBus,
      commandHandler,
      outboxRepository,
    };
  };

  describe('Happy Path', () => {
    it('should successfully create a password reset for an existing user', async () => {
      // Arrange
      const { commandHandler, userRepository, passwordResetRepository } = setup();
      const user = await createUser(userRepository);
      const command = createCommand({ email: user.email.toValue() });

      // Act
      await commandHandler.execute(command);

      // Assert - Verify password reset was created
      const savedPasswordReset = await passwordResetRepository.findByEmail(user.email);
      expect(savedPasswordReset).not.toBeNull();
      expect(savedPasswordReset!.email.toValue()).toBe(command.email);
      expect(savedPasswordReset!.isValid()).toBe(true);
      expect(savedPasswordReset!.id).toBeInstanceOf(Id);
    });

    it('should publish PasswordResetRequestedEvent after password reset creation', async () => {
      // Arrange
      const { commandHandler, userRepository, eventBus } = setup();
      const user = await createUser(userRepository);
      const command = createCommand({ email: user.email.toValue() });

      // Act
      await commandHandler.execute(command);

      // Assert - Check the event was published
      expect(eventBus.events).toBeDefined();
      expect(eventBus.events).toHaveLength(1);

      const publishedEvent = eventBus.events[0] as PasswordResetRequested_DomainEvent;
      expect(publishedEvent).toBeInstanceOf(PasswordResetRequested_DomainEvent);
      expect(publishedEvent.email.toValue()).toBe(command.email);
      expect(publishedEvent.expiration).toBeDefined();
      expect(publishedEvent.occurredOn).toBeInstanceOf(Date);
    });

    it('should store integration event in the outbox', async () => {
      // Arrange
      const { commandHandler, userRepository, outboxRepository, passwordResetRepository } =
        setup();
      const user = await createUser(userRepository);
      const command = createCommand({ email: user.email.toValue() });

      // Act
      await commandHandler.execute(command);

      // Assert
      const outboxEvents = await outboxRepository.findAll();
      expect(outboxEvents).toHaveLength(1);
      expect(outboxEvents[0].eventName.toValue()).toBe(
        PasswordResetRequested_IntegrationEvent.name,
      );
      expect(outboxEvents[0].topic.toValue()).toBe(
        PasswordResetRequested_IntegrationEvent.topic,
      );

      const payload = PasswordResetRequested_IntegrationEvent.fromJSON(
        outboxEvents[0].payload.toJSON(),
      );
      expect(payload.id).toBeDefined();
      expect(payload.email).toBe(command.email);
      expect(payload.expiresAt).toBeInstanceOf(Date);
      expect(payload.occurredOn).toBeInstanceOf(Date);

      // Verify the event's passwordResetId matches the created password reset
      const savedPasswordReset = await passwordResetRepository.findByEmail(user.email);
      expect(payload.passwordResetId).toBe(savedPasswordReset!.id.toValue());
    });

    it('should set proper timestamps on password reset creation', async () => {
      // Arrange
      const { commandHandler, userRepository, passwordResetRepository } = setup();
      const user = await createUser(userRepository);
      const command = createCommand({ email: user.email.toValue() });
      const beforeCreation = DateVO.now();
      await wait(10);

      // Act
      await commandHandler.execute(command);
      await wait(10);
      const afterCreation = DateVO.now();

      // Assert
      const savedPasswordReset = await passwordResetRepository.findByEmail(user.email);
      expect(savedPasswordReset!.timestamps.createdAt.isAfter(beforeCreation)).toBe(true);
      expect(savedPasswordReset!.timestamps.updatedAt.isAfter(beforeCreation)).toBe(true);
      expect(savedPasswordReset!.timestamps.createdAt.isBefore(afterCreation)).toBe(true);
      expect(savedPasswordReset!.timestamps.updatedAt.isBefore(afterCreation)).toBe(true);
    });

    it('should create unique password reset IDs for different requests', async () => {
      // Arrange
      const { commandHandler, userRepository, passwordResetRepository } = setup();
      const user1 = await createUser(userRepository);
      const user2 = await createUser(userRepository);
      const command1 = createCommand({ email: user1.email.toValue() });
      const command2 = createCommand({ email: user2.email.toValue() });

      // Act
      await commandHandler.execute(command1);
      await commandHandler.execute(command2);

      // Assert
      const passwordReset1 = await passwordResetRepository.findByEmail(user1.email);
      const passwordReset2 = await passwordResetRepository.findByEmail(user2.email);
      expect(passwordReset1!.id.toValue()).not.toBe(passwordReset2!.id.toValue());
    });
  });

  describe('Security & Business Logic', () => {
    it('should silently succeed when user does not exist (no information disclosure)', async () => {
      // Arrange
      const { commandHandler, passwordResetRepository } = setup();
      const command = createCommand({ email: 'nonexistent@example.com' });

      // Act
      await commandHandler.execute(command);

      // Assert - No password reset should be created
      const passwordResets = await passwordResetRepository.findAll();
      expect(passwordResets).toHaveLength(0);
    });

    it('should not create a new password reset if a valid one already exists', async () => {
      // Arrange
      const { commandHandler, userRepository, passwordResetRepository, outboxRepository } =
        setup();
      const user = await createUser(userRepository);

      // Create an existing valid password reset
      const existingPasswordReset = PasswordReset.create({
        email: user.email,
      });
      await passwordResetRepository.save(existingPasswordReset);

      const command = createCommand({ email: user.email.toValue() });

      // Act
      await commandHandler.execute(command);

      // Assert - Only one password reset should exist
      const passwordResets = await passwordResetRepository.findAll();
      expect(passwordResets).toHaveLength(1);
      expect(passwordResets[0].id.toValue()).toBe(existingPasswordReset.id.toValue());

      // Assert - No new outbox event should be created
      const outboxEvents = await outboxRepository.findAll();
      expect(outboxEvents).toHaveLength(0);
    });

    it('should create a new password reset if the existing one is expired', async () => {
      // Arrange
      const { commandHandler, userRepository, passwordResetRepository } = setup();
      const user = await createUser(userRepository);

      // Create an expired password reset
      const expiredPasswordReset = PasswordReset.create({
        email: user.email,
      });
      expiredPasswordReset.expiration = Expiration.atHoursFromNow(-1);
      await passwordResetRepository.save(expiredPasswordReset);

      const command = createCommand({ email: user.email.toValue() });

      // Act
      await commandHandler.execute(command);

      // Assert - A new password reset should be created
      const validPasswordReset = await passwordResetRepository.findValidByEmail(user.email);
      expect(validPasswordReset).not.toBeNull();
      expect(validPasswordReset!.id.toValue()).not.toBe(expiredPasswordReset.id.toValue());
    });

    it('should create a new password reset if the existing one is already used', async () => {
      // Arrange
      const { commandHandler, userRepository, passwordResetRepository } = setup();
      const user = await createUser(userRepository);

      // Create a used password reset
      const usedPasswordReset = PasswordReset.create({
        email: user.email,
      });
      usedPasswordReset.used = Used.yes();
      await passwordResetRepository.save(usedPasswordReset);

      const command = createCommand({ email: user.email.toValue() });

      // Act
      await commandHandler.execute(command);

      // Assert - A new password reset should be created
      const validPasswordReset = await passwordResetRepository.findValidByEmail(user.email);
      expect(validPasswordReset).not.toBeNull();
      expect(validPasswordReset!.id.toValue()).not.toBe(usedPasswordReset.id.toValue());
    });
  });

  describe('Error Cases', () => {
    it('should throw InfrastructureException when password reset repository fails', async () => {
      // Arrange
      const { commandHandler, userRepository } = setup({
        shouldFailPasswordResetRepository: true,
      });
      const user = await createUser(userRepository);
      const command = createCommand({ email: user.email.toValue() });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(InfrastructureException);
    });

    it('should propagate failures when storing the integration event in the Outbox fails', async () => {
      // Arrange
      const { commandHandler, userRepository, passwordResetRepository } = setup({
        shouldFailOutbox: true,
      });
      const user = await createUser(userRepository);
      const command = createCommand({ email: user.email.toValue() });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(InfrastructureException);

      // Verify that the password reset was not created (Transaction)
      const passwordReset = await passwordResetRepository.findByEmail(user.email);
      expect(passwordReset).toBeNull();
    });

    it('should throw ApplicationException when EventBus publishing fails', async () => {
      // Arrange
      const { commandHandler, userRepository, passwordResetRepository, outboxRepository } = setup(
        {
          shouldFailEventBus: true,
        },
      );
      const user = await createUser(userRepository);
      const command = createCommand({ email: user.email.toValue() });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(ApplicationException);

      // Verify that the password reset was not created (Transaction)
      const passwordReset = await passwordResetRepository.findByEmail(user.email);
      expect(passwordReset).toBeNull();

      // Verify that the integration event was not stored in the Outbox
      const outboxEvents = await outboxRepository.findAll();
      expect(outboxEvents).toHaveLength(0);
    });
  });
});
