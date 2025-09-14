import { LoginUserCommandHandler } from './login-user.command-handler';
import { LoginUserCommand } from './login-user.command';
import { UserInMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user-in-memory.repository';
import { EventBus } from '@nestjs/cqrs';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { Email, Username, Password, UserStatus, LastLogin } from '@bc/auth/domain/value-objects';
import {
  UnauthorizedException,
  createEventBusMock,
  InfrastructureException,
  DomainValidationException,
  JwtTokenService,
  createJwtTokenServiceMock,
  wait,
  DateVO,
  ApplicationException,
} from '@libs/nestjs-common';

describe('LoginUserCommandHandler', () => {
  // Test data factory
  const createCommand = (overrides: Partial<LoginUserCommand> = {}) =>
    new LoginUserCommand(
      overrides.email || Email.random().toValue(),
      overrides.password || Password.random().toValue(),
    );

  // Setup factory
  const setup = async (params: { withDefaultUser?: boolean; withStatus?: UserStatus; shouldFailRepository?: boolean; shouldFailEventBus?: boolean } = {}) => {
    const { withDefaultUser = false, withStatus = UserStatus.active(), shouldFailRepository = false, shouldFailEventBus = false } = params;

    const repository = new UserInMemoryRepository(shouldFailRepository);
    const eventBus = createEventBusMock({ shouldFail: shouldFailEventBus });
    const jwtTokenService = createJwtTokenServiceMock({});
    const commandHandler = new LoginUserCommandHandler(
      repository,
      jwtTokenService as unknown as JwtTokenService,
      eventBus as unknown as EventBus,
    );

    let user : User | undefined;
    if (withDefaultUser) {
      user = User.random({
        status: withStatus,
        password: await Password.createFromPlainText('password123'),
      });
      await repository.save(user);
    }

    return { repository, eventBus, jwtTokenService, commandHandler, user };
  };

  describe('Happy Path', () => {
    it('should successfully authenticate user with valid credentials', async () => {
      // Arrange
      const { commandHandler, user } = await setup({ withDefaultUser: true });

      const command = createCommand({
        email: user!.email.toValue(),
        password: 'password123',
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe(user!.id.toValue());
      expect(result.email).toBe(user!.email.toValue());
      expect(result.username).toBe(user!.username.toValue());
      expect(result.role).toBe(user!.role.toValue());
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
    });

    it('should update lastLogin timestamp on successful login', async () => {
      // Arrange
      const { commandHandler, repository, user } = await setup({ withDefaultUser: true });
      const command = createCommand({
        email: user!.email.toValue(),
        password: 'password123',
      });
      const beforeLogin = DateVO.now();

      // Act
      await wait(10);
      await commandHandler.execute(command);
      await wait(10);
      const afterLogin = DateVO.now();

      // Assert
      const updatedUser = await repository.findById(user!.id);
      expect(updatedUser!.lastLogin).toBeDefined();
      expect(updatedUser!.lastLogin.isNever()).toBe(false);
      expect(updatedUser!.lastLogin.isAfter(beforeLogin)).toBe(true);
      expect(updatedUser!.lastLogin.isBefore(afterLogin)).toBe(true);
    });
  });

  describe('Authentication Failures', () => {
    it('should throw UnauthorizedException when user does not exist', async () => {
      // Arrange
      const { commandHandler } = await setup({ withDefaultUser: false });
      const command = createCommand();

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      // Arrange
      const { commandHandler, user } = await setup({ withDefaultUser: true });
      const command = createCommand({
        email: user!.email.toValue(),
        password: 'WrongPassword456!',
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      // Arrange
      const { commandHandler, user } = await setup({ withDefaultUser: true, withStatus: UserStatus.inactive() });
      const command = createCommand({
        email: user!.email.toValue(),
        password: user!.password.toValue(),
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is email verification pending', async () => {
      // Arrange
      const { commandHandler, user } = await setup({ withDefaultUser: true, withStatus: UserStatus.emailVerificationPending() });
      const command = createCommand({
        email: user!.email.toValue(),
        password: 'password123',
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Input Validation', () => {
    it('should throw UnauthorizedException for empty password', async () => {
      // Arrange
      const { commandHandler } = await setup();
      const command = createCommand({ password: '' });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for whitespace-only password', async () => {
      // Arrange
      const { commandHandler } = await setup();
      const command = createCommand({ password: '   ' });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(UnauthorizedException);
    });

    it('should validate email format', async () => {
      // Arrange
      const { commandHandler } = await setup();
      const command = createCommand({ email: 'invalid-email' });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(DomainValidationException);
    });
  });

  describe('Error Cases', () => {
    it('should throw InfrastructureException when repository fails', async () => {
      // Arrange
      const { commandHandler } = await setup({ shouldFailRepository: true });
      const command = createCommand();

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(InfrastructureException);
    });

    it('should propagate event bus exceptions', async () => {
      // Arrange
      const { commandHandler, user } = await setup({ withDefaultUser: true, shouldFailEventBus: true });
      const command = createCommand({
        email: user!.email.toValue(),
        password: 'password123',
      });

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(ApplicationException);
    });
  });
});
