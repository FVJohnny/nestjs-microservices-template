import { ExecutePasswordReset_CommandHandler } from './execute-password-reset.command-handler';
import { ExecutePasswordReset_Command } from './execute-password-reset.command';
import { User_InMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user.in-memory-repository';
import { PasswordReset_InMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/password-reset.in-memory-repository';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { PasswordReset } from '@bc/auth/domain/entities/password-reset/password-reset.entity';
import { Email, Username, Password, Expiration, Used } from '@bc/auth/domain/value-objects';
import {
  ApplicationException,
  DateVO,
  InfrastructureException,
  MockEventBus,
  NotFoundException,
  InvalidOperationException,
  wait,
} from '@libs/nestjs-common';
import { UserPasswordChanged_DomainEvent } from '@bc/auth/domain/events/password-changed.domain-event';
import { UserLogout_DomainEvent } from '@bc/auth/domain/events/user-logout.domain-event';

describe('ExecutePasswordResetCommandHandler', () => {
  // Test data factory
  const createCommand = (props?: Partial<ExecutePasswordReset_Command>) =>
    new ExecutePasswordReset_Command(
      props?.passwordResetId || PasswordReset.random().id.toValue(),
      props?.newPassword || 'NewSecurePassword123!',
    );

  const createUser = async (userRepository: User_InMemoryRepository, email?: Email) => {
    const user = User.create({
      email: email || Email.random(),
      username: Username.random(),
      password: await Password.createFromPlainText('OldPassword123!'),
    });
    await userRepository.save(user);
    return user;
  };

  const createPasswordReset = async (
    passwordResetRepository: PasswordReset_InMemoryRepository,
    email: Email,
    isValid: boolean = true,
  ) => {
    const passwordReset = PasswordReset.create({ email });
    if (!isValid) {
      passwordReset.expiration = Expiration.atHoursFromNow(-1); // Expired
    }
    await passwordResetRepository.save(passwordReset);
    return passwordReset;
  };

  // Setup factory
  const setup = (
    params: {
      shouldFailPasswordResetRepository?: boolean;
      shouldFailUserRepository?: boolean;
      shouldFailEventBus?: boolean;
    } = {},
  ) => {
    const {
      shouldFailPasswordResetRepository = false,
      shouldFailUserRepository = false,
      shouldFailEventBus = false,
    } = params;

    const userRepository = new User_InMemoryRepository(shouldFailUserRepository);
    const passwordResetRepository = new PasswordReset_InMemoryRepository(
      shouldFailPasswordResetRepository,
    );
    const eventBus = new MockEventBus({ shouldFail: shouldFailEventBus });
    const commandHandler = new ExecutePasswordReset_CommandHandler(
      userRepository,
      passwordResetRepository,
      eventBus,
    );

    return {
      userRepository,
      passwordResetRepository,
      eventBus,
      commandHandler,
    };
  };

  describe('Happy Path', () => {
    it('should successfully reset password for a valid password reset', async () => {
      // Arrange
      const { commandHandler, userRepository, passwordResetRepository } = setup();
      const user = await createUser(userRepository);
      const passwordReset = await createPasswordReset(passwordResetRepository, user.email);
      const oldPasswordHash = user.password.toValue();
      const command = createCommand({
        passwordResetId: passwordReset.id.toValue(),
        newPassword: 'NewSecurePassword123!',
      });

      // Act
      await commandHandler.execute(command);

      // Assert - Verify password was changed
      const updatedUser = await userRepository.findById(user.id);
      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.password.toValue()).not.toBe(oldPasswordHash);

      // Verify password reset was marked as used
      const updatedPasswordReset = await passwordResetRepository.findById(passwordReset.id);
      expect(updatedPasswordReset).not.toBeNull();
      expect(updatedPasswordReset!.isUsed()).toBe(true);
      expect(updatedPasswordReset!.isValid()).toBe(false);
    });

    it('should publish PasswordChangedEvent after password reset', async () => {
      // Arrange
      const { commandHandler, userRepository, passwordResetRepository, eventBus } = setup();
      const user = await createUser(userRepository);
      const passwordReset = await createPasswordReset(passwordResetRepository, user.email);
      const command = createCommand({
        passwordResetId: passwordReset.id.toValue(),
        newPassword: 'NewSecurePassword123!',
      });

      // Act
      await commandHandler.execute(command);

      // Assert - Check the events were published
      expect(eventBus.events).toBeDefined();
      expect(eventBus.events).toHaveLength(2);

      const passwordChangedEvent = eventBus.events[0] as UserPasswordChanged_DomainEvent;
      expect(passwordChangedEvent).toBeInstanceOf(UserPasswordChanged_DomainEvent);
      expect(passwordChangedEvent.email.toValue()).toBe(user.email.toValue());
      expect(passwordChangedEvent.occurredOn).toBeInstanceOf(Date);

      const logoutEvent = eventBus.events[1];
      expect(logoutEvent).toBeInstanceOf(UserLogout_DomainEvent);
      expect(logoutEvent.occurredOn).toBeInstanceOf(Date);
    });

    it('should update timestamps on password change', async () => {
      // Arrange
      const { commandHandler, userRepository, passwordResetRepository } = setup();
      const user = await createUser(userRepository);
      const passwordReset = await createPasswordReset(passwordResetRepository, user.email);
      const command = createCommand({
        passwordResetId: passwordReset.id.toValue(),
        newPassword: 'NewSecurePassword123!',
      });
      const beforeChange = DateVO.now();
      await wait(10);

      // Act
      await commandHandler.execute(command);
      await wait(10);
      const afterChange = DateVO.now();

      // Assert - User timestamps
      const updatedUser = await userRepository.findById(user.id);
      expect(updatedUser!.timestamps.updatedAt.isAfter(beforeChange)).toBe(true);
      expect(updatedUser!.timestamps.updatedAt.isBefore(afterChange)).toBe(true);

      // Assert - Password reset timestamps
      const updatedPasswordReset = await passwordResetRepository.findById(passwordReset.id);
      expect(updatedPasswordReset!.timestamps.updatedAt.isAfter(beforeChange)).toBe(true);
      expect(updatedPasswordReset!.timestamps.updatedAt.isBefore(afterChange)).toBe(true);
    });

    it('should hash the new password', async () => {
      // Arrange
      const { commandHandler, userRepository, passwordResetRepository } = setup();
      const user = await createUser(userRepository);
      const passwordReset = await createPasswordReset(passwordResetRepository, user.email);
      const oldPasswordHash = user.password.toValue();
      const newPassword = 'NewSecurePassword123!';
      const command = createCommand({
        passwordResetId: passwordReset.id.toValue(),
        newPassword,
      });

      // Act
      await commandHandler.execute(command);

      // Assert - Verify password was changed and is different from old password
      const updatedUser = await userRepository.findById(user.id);
      expect(updatedUser!.password.toValue()).not.toBe(oldPasswordHash);
      expect(updatedUser!.password.toValue()).not.toBe(newPassword); // Should be hashed, not plaintext
    });
  });

  describe('Validation & Error Cases', () => {
    it('should throw NotFoundException when password reset does not exist', async () => {
      // Arrange
      const { commandHandler } = setup();
      const command = createCommand();

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      const { commandHandler, passwordResetRepository } = setup();
      const passwordReset = await createPasswordReset(passwordResetRepository, Email.random());
      const command = createCommand({
        passwordResetId: passwordReset.id.toValue(),
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw InvalidOperationException when password reset is expired', async () => {
      // Arrange
      const { commandHandler, userRepository, passwordResetRepository } = setup();
      const user = await createUser(userRepository);
      const passwordReset = await createPasswordReset(
        passwordResetRepository,
        user.email,
        false, // expired
      );
      const command = createCommand({
        passwordResetId: passwordReset.id.toValue(),
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(InvalidOperationException);
    });

    it('should throw InvalidOperationException when password reset is already used', async () => {
      // Arrange
      const { commandHandler, userRepository, passwordResetRepository } = setup();
      const user = await createUser(userRepository);
      const passwordReset = await createPasswordReset(passwordResetRepository, user.email);
      passwordReset.used = Used.yes();
      await passwordResetRepository.save(passwordReset);
      const command = createCommand({
        passwordResetId: passwordReset.id.toValue(),
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(InvalidOperationException);
    });

    it('should throw InfrastructureException when user repository fails', async () => {
      // Arrange
      const { commandHandler, userRepository, passwordResetRepository } = setup();
      const user = await createUser(userRepository);
      const passwordReset = await createPasswordReset(passwordResetRepository, user.email);

      const command = createCommand({
        passwordResetId: passwordReset.id.toValue(),
      });

      userRepository.shouldFail = true;

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(InfrastructureException);
    });

    it('should throw InfrastructureException when password reset repository fails', async () => {
      // Arrange
      const { commandHandler, userRepository, passwordResetRepository } = setup();
      const user = await createUser(userRepository);
      const passwordReset = await createPasswordReset(passwordResetRepository, user.email);

      const command = createCommand({
        passwordResetId: passwordReset.id.toValue(),
      });

      passwordResetRepository.shouldFail = true;

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(InfrastructureException);
    });

    it('should throw ApplicationException when EventBus publishing fails', async () => {
      // Arrange
      const { commandHandler, userRepository, passwordResetRepository } = setup({
        shouldFailEventBus: true,
      });
      const user = await createUser(userRepository);
      const passwordReset = await createPasswordReset(passwordResetRepository, user.email);
      const oldPasswordHash = user.password.toValue();
      const command = createCommand({
        passwordResetId: passwordReset.id.toValue(),
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(ApplicationException);

      // Verify that changes were rolled back (Transaction)
      const updatedUser = await userRepository.findById(user.id);
      expect(updatedUser!.password.toValue()).toBe(oldPasswordHash);

      const updatedPasswordReset = await passwordResetRepository.findById(passwordReset.id);
      expect(updatedPasswordReset!.isUsed()).toBe(false);
    });
  });

  describe('Transaction Behavior', () => {
    it('should rollback all changes when transaction fails', async () => {
      // Arrange
      const { commandHandler, userRepository, passwordResetRepository } = setup({
        shouldFailEventBus: true,
      });
      const user = await createUser(userRepository);
      const passwordReset = await createPasswordReset(passwordResetRepository, user.email);
      const oldPasswordHash = user.password.toValue();
      const command = createCommand({
        passwordResetId: passwordReset.id.toValue(),
      });

      // Act
      try {
        await commandHandler.execute(command);
      } catch (error) {
        // Expected to fail
      }

      // Assert - Verify rollback
      const updatedUser = await userRepository.findById(user.id);
      const updatedPasswordReset = await passwordResetRepository.findById(passwordReset.id);

      expect(updatedUser!.password.toValue()).toBe(oldPasswordHash);
      expect(updatedPasswordReset!.isUsed()).toBe(false);
      expect(updatedPasswordReset!.isValid()).toBe(true);
    });
  });
});
