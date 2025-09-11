import { LoginUserCommandHandler } from './login-user.command-handler';
import { LoginUserCommand } from './login-user.command';
import { UserInMemoryRepository } from '../../../infrastructure/repositories/in-memory/user-in-memory.repository';
import { EventBus } from '@nestjs/cqrs';
import { User } from '../../../domain/entities/user/user.entity';
import { Email, Username, Password, UserStatus } from '../../../domain/value-objects';
import {
  UnauthorizedException,
  createEventBusMock,
  InfrastructureException,
  DomainValidationException,
} from '@libs/nestjs-common';

describe('LoginUserCommandHandler', () => {
  // Test data factory
  const createCommand = (overrides: Partial<LoginUserCommand> = {}) =>
    new LoginUserCommand(
      overrides.email || 'test@example.com',
      overrides.password || 'TestPassword123!',
    );

  // Setup factory
  const setup = (params: { shouldFailRepository?: boolean; shouldFailEventBus?: boolean } = {}) => {
    const { shouldFailRepository = false, shouldFailEventBus = false } = params;

    const repository = new UserInMemoryRepository(shouldFailRepository);
    const eventBus = createEventBusMock({ shouldFail: shouldFailEventBus });
    const jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    } as any;
    const commandHandler = new LoginUserCommandHandler(
      repository,
      jwtService,
      eventBus as unknown as EventBus,
    );

    return { repository, eventBus, jwtService, commandHandler };
  };

  describe('Happy Path', () => {
    it('should successfully authenticate user with valid credentials', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const password = 'TestPassword123!';
      const dateBeforeLogin = new Date();
      const user = User.random({
        email: new Email('john.doe@example.com'),
        username: new Username('johndoe'),
        password: await Password.createFromPlainText(password),
        status: UserStatus.active(),
        lastLoginAt: new Date(0),
      });
      await repository.save(user);

      const command = createCommand({
        email: user.email.toValue(),
        password: password,
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe(user.id);
      expect(result.email).toBe(user.email.toValue());
      expect(result.username).toBe(user.username.toValue());
      expect(result.role).toBe(user.role.toValue());
      expect(result.accessToken).toBe('mock-jwt-token');
    });

    it('should update lastLoginAt timestamp on successful login', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const password = 'MyPassword789!';
      const beforeLogin = new Date();
      const user = User.random({
        email: new Email('user@example.com'),
        password: await Password.createFromPlainText(password),
        status: UserStatus.active(),
        lastLoginAt: undefined,
      });
      await repository.save(user);

      const command = createCommand({
        email: user.email.toValue(),
        password: password,
      });

      // Act
      await commandHandler.execute(command);
      const afterLogin = new Date();

      // Assert
      const updatedUser = await repository.findById(user.id);
      expect(updatedUser!.lastLoginAt).toBeDefined();
      expect(updatedUser!.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
      expect(updatedUser!.lastLoginAt!.getTime()).toBeLessThanOrEqual(afterLogin.getTime());
    });
  });

  describe('Authentication Failures', () => {
    it('should throw UnauthorizedException when user does not exist', async () => {
      // Arrange
      const { commandHandler } = setup();
      const command = createCommand({
        email: 'nonexistent@example.com',
        password: 'SomePassword123!',
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const user = User.random({
        email: new Email('user@example.com'),
        password: await Password.createFromPlainText('CorrectPassword123!'),
        status: UserStatus.active(),
      });
      await repository.save(user);

      const command = createCommand({
        email: user.email.toValue(),
        password: 'WrongPassword456!',
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is not active', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const password = 'ValidPassword123!';
      const user = User.random({
        email: new Email('inactive@example.com'),
        password: await Password.createFromPlainText(password),
        status: UserStatus.inactive(),
      });
      await repository.save(user);

      const command = createCommand({
        email: user.email.toValue(),
        password: password,
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is email verification pending', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const password = 'ValidPassword123!';
      const user = User.random({
        email: new Email('pending@example.com'),
        password: await Password.createFromPlainText(password),
        status: UserStatus.emailVerificationPending(),
      });
      await repository.save(user);

      const command = createCommand({
        email: user.email.toValue(),
        password: password,
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Input Validation', () => {
    it('should throw UnauthorizedException for empty password', async () => {
      // Arrange
      const { commandHandler } = setup();
      const command = createCommand({
        email: 'test@example.com',
        password: '',
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for whitespace-only password', async () => {
      // Arrange
      const { commandHandler } = setup();
      const command = createCommand({
        email: 'test@example.com',
        password: '   ',
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(UnauthorizedException);
    });

    it('should validate email format', async () => {
      // Arrange
      const { commandHandler } = setup();
      const command = createCommand({
        email: 'invalid-email',
        password: 'ValidPassword123!',
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(DomainValidationException);
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
      const { commandHandler, repository } = setup({ shouldFailEventBus: true });
      const password = 'TestPassword123!';
      const user = User.random({
        email: new Email('test@example.com'),
        password: await Password.createFromPlainText(password),
        status: UserStatus.active(),
      });
      await repository.save(user);

      const command = createCommand({
        email: 'test@example.com',
        password: password,
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(InfrastructureException);
    });
  });

  describe('Edge Cases', () => {
    it('should login correctly with special characters in email', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const password = 'SpecialPassword123!';
      const user = User.random({
        email: new Email('test+user.name@sub-domain.example.com'),
        password: await Password.createFromPlainText(password),
        status: UserStatus.active(),
      });
      await repository.save(user);

      const command = createCommand({
        email: user.email.toValue(),
        password: password,
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe(user.email.toValue());
    });
  });
});
