import { RegisterUserCommandHandler } from './register-user.command-handler';
import { RegisterUserCommand } from './register-user.command';
import { UserInMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user-in-memory.repository';
import { EventBus } from '@nestjs/cqrs';
import { Email, Username, Password, UserRoleEnum, UserRole } from '@bc/auth/domain/value-objects';
import {
  AlreadyExistsException,
  createEventBusMock,
  InfrastructureException,
  Id,
  Timestamps,
  DateVO,
  wait,
} from '@libs/nestjs-common';
import { UserRegisteredDomainEvent } from '@bc/auth/domain/events/user-registered.domain-event';

describe('RegisterUserCommandHandler', () => {
  // Test data factory
  const createCommand = (props?: Partial<RegisterUserCommand>) =>
    new RegisterUserCommand({
      email: props?.email || Email.random().toValue(),
      username: props?.username || Username.random().toValue(),
      password: props?.password || Password.random().toValue(),
      role: props?.role || UserRole.random().toValue(),
    });

  // Setup factory
  const setup = (params: { shouldFailRepository?: boolean; shouldFailEventBus?: boolean } = {}) => {
    const { shouldFailRepository = false, shouldFailEventBus = false } = params;

    const repository = new UserInMemoryRepository(shouldFailRepository);
    const eventBus = createEventBusMock({ shouldFail: shouldFailEventBus });
    const commandHandler = new RegisterUserCommandHandler(
      repository,
      eventBus as unknown as EventBus,
    );

    return { repository, eventBus, commandHandler };
  };
  describe('Happy Path', () => {
    it('should successfully register a new user with complete information', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const command = createCommand();

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      // Verify user was saved
      const savedUser = await repository.findById(new Id(result.id));
      expect(savedUser).not.toBeNull();
      expect(savedUser!.email.toValue()).toBe(command.email);
      expect(savedUser!.username.toValue()).toBe(command.username);
      expect(savedUser!.role.toValue()).toBe(command.role);
      expect(savedUser!.isEmailVerificationPending()).toBe(true);
    });

    it('should publish UserRegisteredEvent after user creation', async () => {
      // Arrange
      const { commandHandler, eventBus } = setup();
      const command = createCommand();

      // Act
      const result = await commandHandler.execute(command);
      expect(eventBus.events).toBeDefined();
      expect(eventBus.events).toHaveLength(1);

      const publishedEvent = eventBus.events[0] as UserRegisteredDomainEvent;
      expect(publishedEvent).toBeInstanceOf(UserRegisteredDomainEvent);
      expect(publishedEvent.aggregateId.toValue()).toBe(result.id);
      expect(publishedEvent.email.toValue()).toBe(command.email);
      expect(publishedEvent.username.toValue()).toBe(command.username);
      expect(publishedEvent.role.toValue()).toBe(command.role);
      expect(publishedEvent.occurredOn).toBeInstanceOf(Date);
    });

    it('should set proper timestamps on user creation', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const command = createCommand();
      const beforeCreation = DateVO.now();
      await wait(10);

      // Act
      const result = await commandHandler.execute(command);
      await wait(10);
      const afterCreation = DateVO.now();

      // Assert
      const savedUser = await repository.findById(new Id(result.id));
      expect(savedUser!.timestamps.createdAt.isAfter(beforeCreation)).toBe(true);
      expect(savedUser!.timestamps.createdAt.isBefore(afterCreation)).toBe(true);
      expect(savedUser!.timestamps.updatedAt.isAfter(beforeCreation)).toBe(true);
      expect(savedUser!.timestamps.updatedAt.isBefore(afterCreation)).toBe(true);
      expect(savedUser!.lastLogin.isNever()).toBe(true);
    });
    it('should create unique user IDs for different registrations', async () => {
      // Arrange
      const { commandHandler } = setup();
      const command1 = createCommand();
      const command2 = createCommand();

      // Act
      const result1 = await commandHandler.execute(command1);
      const result2 = await commandHandler.execute(command2);

      // Assert
      expect(result1.id).not.toBe(result2.id);
      expect(result1.id).toBeDefined();
      expect(result2.id).toBeDefined();
    });
  });

  describe('Error Cases', () => {
    it('should throw InfrastructureException when repository fails', async () => {
      // Arrange
      const { commandHandler } = setup({ shouldFailRepository: true });
      const command = createCommand();
      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(InfrastructureException);
    });

    it('should throw InfrastructureException when EventBus publishing fails', async () => {
      // Arrange
      const { commandHandler } = setup({ shouldFailEventBus: true });
      const command = createCommand();

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(InfrastructureException);
    });

    it('should throw AlreadyExistsException when email already exists', async () => {
      // Arrange 1
      const { commandHandler } = setup();

      // Act 1
      const command = createCommand();
      await commandHandler.execute(command);

      // Arrange 2
      const duplicateEmailCommand = createCommand({ email: command.email });

      // Act 2 & Assert
      await expect(commandHandler.execute(duplicateEmailCommand)).rejects.toThrow(
        AlreadyExistsException,
      );
    });
    it('should throw AlreadyExistsException when username already exists', async () => {
      // Arrange 1
      const { commandHandler } = setup();
      const command = createCommand();

      // Act 1
      await commandHandler.execute(command);

      // Arrange 2
      const duplicateUsernameCommand = createCommand({
        username: command.username,
      });

      // Act 2 & Assert
      await expect(commandHandler.execute(duplicateUsernameCommand)).rejects.toThrow(
        AlreadyExistsException,
      );
    });
  });
});
