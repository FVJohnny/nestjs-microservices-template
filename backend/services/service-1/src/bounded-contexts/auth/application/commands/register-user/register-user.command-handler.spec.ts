import { RegisterUserCommandHandler } from './register-user.command-handler';
import { RegisterUserCommand } from './register-user.command';
import { UserInMemoryRepository } from '../../../infrastructure/repositories/in-memory/user-in-memory.repository';
import { EventBus } from '@nestjs/cqrs';
import { UserRoleEnum } from '../../../domain/value-objects/user-role.vo';
import { AlreadyExistsException, createEventBusMock, InfrastructureException, MockEventBus } from '@libs/nestjs-common';
import { UserRegisteredDomainEvent } from '../../../domain/events/user-registered.domain-event';

describe('RegisterUserCommandHandler (Unit)', () => {
  // Test data factory
  const createCommand = (overrides: Partial<RegisterUserCommand> = {}) => new RegisterUserCommand({
    email: 'test@example.com',
    username: 'testuser',
    password: 'TestPassword123!',
    role: UserRoleEnum.USER,
    ...overrides,
  });

  // Setup factory
  const setup = (params: { shouldFailRepository?: boolean, shouldFailEventBus?: boolean } = {}) => {
    const { shouldFailRepository = false, shouldFailEventBus = false } = params;

    const repository = new UserInMemoryRepository(shouldFailRepository);
    const eventBus = createEventBusMock({ shouldFail: shouldFailEventBus });
    const commandHandler = new RegisterUserCommandHandler(repository, eventBus as unknown as EventBus);
    
    return { repository, eventBus, commandHandler };
  };
  describe('Happy Path', () => {
    it('should successfully register a new user with complete information', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const command = createCommand({
        email: 'john.doe@example.com',
        username: 'johndoe',
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      // Verify user was saved
      const savedUser = await repository.findById(result.id);
      expect(savedUser).not.toBeNull();
      expect(savedUser!.email.toValue()).toBe('john.doe@example.com');
      expect(savedUser!.username.toValue()).toBe('johndoe');
      expect(savedUser!.role.toValue()).toBe(UserRoleEnum.USER);
    });
    it('should register user with minimal required fields only', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const command = createCommand({
        email: 'minimal@example.com',
        username: 'minimaluser',
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result.id).toBeDefined();
      const savedUser = await repository.findById(result.id);
      expect(savedUser!.email.toValue()).toBe('minimal@example.com');
      expect(savedUser!.username.toValue()).toBe('minimaluser');
      expect(savedUser!.role.toValue()).toBe(UserRoleEnum.USER);
    });
    it('should publish UserRegisteredEvent after user creation', async () => {
      // Arrange
      const { commandHandler, eventBus } = setup();
      const command = createCommand({
        email: 'events@example.com',
        username: 'eventsuser',
        role: UserRoleEnum.ADMIN,
      });

      // Act
      const result = await commandHandler.execute(command);
      expect(eventBus.events).toBeDefined();
      expect(eventBus.events).toHaveLength(1);
  
      const publishedEvent = eventBus.events[0] as UserRegisteredDomainEvent;
      expect(publishedEvent).toBeInstanceOf(UserRegisteredDomainEvent);
      expect(publishedEvent.aggregateId).toBe(result.id);
      expect(publishedEvent.email.toValue()).toBe('events@example.com');
      expect(publishedEvent.username.toValue()).toBe('eventsuser');
      expect(publishedEvent.occurredOn).toBeInstanceOf(Date);
      expect(publishedEvent.role.toValue()).toBe(UserRoleEnum.ADMIN);
    });
    it('should create user with email-verification-pending status', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const command = createCommand();

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      const savedUser = await repository.findById(result.id);
      expect(savedUser!.isEmailVerificationPending()).toBe(true);
    });
    it('should set proper timestamps on user creation', async () => {
      // Arrange
      const { commandHandler, repository } = setup();
      const command = createCommand();
      const beforeCreation = new Date();

      // Act
      const result = await commandHandler.execute(command);
      const afterCreation = new Date();
  
      // Assert
      const savedUser = await repository.findById(result.id);
      expect(savedUser!.createdAt).toBeInstanceOf(Date);
      expect(savedUser!.updatedAt).toBeInstanceOf(Date);
      expect(savedUser!.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(savedUser!.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
      expect(savedUser!.updatedAt.getTime()).toBe(savedUser!.createdAt.getTime());
      expect(savedUser!.lastLoginAt).toBeUndefined();
    });
    it('should create unique user IDs for different registrations', async () => {
      // Arrange
      const { commandHandler } = setup();
      const command1 = createCommand({ email: 'user1@example.com', username: 'user1' });
      const command2 = createCommand({ email: 'user2@example.com', username: 'user2' });

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
    it('should handle repository failures gracefully', async () => {
      // Arrange
      const { commandHandler } = setup({ shouldFailRepository: true });
      const command = createCommand();
      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(InfrastructureException);
    });
    it('should handle EventBus publishing failures gracefully', async () => {
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
      const existingCommand = createCommand({ email: 'existing@example.com', username: 'user1' });
      await commandHandler.execute(existingCommand);

      // Arrange 2
      const duplicateEmailCommand = createCommand({ email: 'existing@example.com', username: 'user2' });

      // Act 2 & Assert
      await expect(commandHandler.execute(duplicateEmailCommand)).rejects.toThrow(
        AlreadyExistsException,
      );
    });
    it('should throw AlreadyExistsException when username already exists', async () => {
      // Arrange
      const { commandHandler } = setup();
      const existingCommand = createCommand({ email: 'user1@example.com', username: 'existinguser' });
      await commandHandler.execute(existingCommand);
      const duplicateUsernameCommand = createCommand({ email: 'user2@example.com', username: 'existinguser' });
      // Act & Assert
      await expect(commandHandler.execute(duplicateUsernameCommand)).rejects.toThrow(
        AlreadyExistsException,
      );
    });
  });
});
