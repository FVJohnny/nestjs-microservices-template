import { RegisterUser_CommandHandler } from './register-user.command-handler';
import { RegisterUser_Command } from './register-user.command';
import { User_InMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user.in-memory-repository';
import { Email, Username, Password, UserRoleEnum } from '@bc/auth/domain/value-objects';
import {
  AlreadyExistsException,
  ApplicationException,
  DateVO,
  InfrastructureException,
  MockEventBus,
  UserCreated_IntegrationEvent,
  wait,
  Outbox_InMemoryRepository,
  Id,
} from '@libs/nestjs-common';
import { UserRegistered_DomainEvent } from '@bc/auth/domain/events/user-registered.domain-event';

describe('RegisterUserCommandHandler', () => {
  // Test data factory
  const createCommand = (props?: Partial<RegisterUser_Command>) =>
    new RegisterUser_Command({
      email: props?.email || Email.random().toValue(),
      username: props?.username || Username.random().toValue(),
      password: props?.password || Password.random().toValue(),
    });

  // Setup factory
  const setup = (
    params: {
      shouldFailRepository?: boolean;
      shouldFailEventBus?: boolean;
      shouldFailOutbox?: boolean;
    } = {},
  ) => {
    const {
      shouldFailRepository = false,
      shouldFailEventBus = false,
      shouldFailOutbox = false,
    } = params;

    const outboxRepository = new Outbox_InMemoryRepository(shouldFailOutbox);

    const userRepository = new User_InMemoryRepository(shouldFailRepository);
    const eventBus = new MockEventBus({ shouldFail: shouldFailEventBus });
    const commandHandler = new RegisterUser_CommandHandler(
      userRepository,
      outboxRepository,
      eventBus,
    );

    return { userRepository, eventBus, commandHandler, outboxRepository };
  };
  describe('Happy Path', () => {
    it('should successfully register a new user with complete information', async () => {
      // Arrange
      const { commandHandler, userRepository } = setup();
      const command = createCommand();

      // Act
      await commandHandler.execute(command);

      // Assert - Verify user was saved by finding it in repository
      const savedUser = await userRepository.findByEmail(new Email(command.email));
      expect(savedUser).not.toBeNull();
      expect(savedUser!.email.toValue()).toBe(command.email);
      expect(savedUser!.username.toValue()).toBe(command.username);
      expect(savedUser!.role.toValue()).toBe(UserRoleEnum.USER);
      expect(savedUser!.isEmailVerificationPending()).toBe(true);
      expect(savedUser!.id).toBeInstanceOf(Id);
    });

    it('should publish UserRegisteredEvent after user creation', async () => {
      // Arrange
      const { commandHandler, eventBus, userRepository: repository } = setup();
      const command = createCommand();

      // Act
      await commandHandler.execute(command);

      // Assert - Check the event was published
      expect(eventBus.events).toBeDefined();
      expect(eventBus.events).toHaveLength(1);

      const publishedEvent = eventBus.events[0] as UserRegistered_DomainEvent;
      expect(publishedEvent).toBeInstanceOf(UserRegistered_DomainEvent);
      expect(publishedEvent.userId).toBeInstanceOf(Id);
      expect(publishedEvent.email.toValue()).toBe(command.email);
      expect(publishedEvent.username.toValue()).toBe(command.username);
      expect(publishedEvent.role.toValue()).toBe(UserRoleEnum.USER);
      expect(publishedEvent.occurredOn).toBeInstanceOf(Date);

      // Verify the event's aggregateId matches the created user
      const savedUser = await repository.findByEmail(new Email(command.email));
      expect(publishedEvent.aggregateId.toValue()).toBe(savedUser!.id.toValue());
    });

    it('should store integration event in the outbox', async () => {
      // Arrange
      const { commandHandler, outboxRepository, userRepository: repository } = setup();
      const command = createCommand();

      // Act
      await commandHandler.execute(command);

      // Assert
      const outboxEvents = await outboxRepository.findAll();
      expect(outboxEvents).toHaveLength(1);
      expect(outboxEvents[0].eventName.toValue()).toBe(UserCreated_IntegrationEvent.name);
      expect(outboxEvents[0].topic.toValue()).toBe(UserCreated_IntegrationEvent.topic);

      const payload = UserCreated_IntegrationEvent.fromJSON(outboxEvents[0].payload.toJSON());
      expect(payload.id).toBeDefined();
      expect(payload.email).toBe(command.email);
      expect(payload.username).toBe(command.username);
      expect(payload.role).toBe(UserRoleEnum.USER);
      expect(payload.occurredOn).toBeInstanceOf(Date);

      // Verify the event's userId matches the created user
      const savedUser = await repository.findByEmail(new Email(command.email));
      expect(payload.userId).toBe(savedUser!.id.toValue());
    });

    it('should set proper timestamps on user creation', async () => {
      // Arrange
      const { commandHandler, userRepository: repository } = setup();
      const command = createCommand();
      const beforeCreation = DateVO.now();
      await wait(10);

      // Act
      await commandHandler.execute(command);
      await wait(10);
      const afterCreation = DateVO.now();

      // Assert
      const savedUser = await repository.findByEmail(new Email(command.email));
      expect(savedUser!.timestamps.createdAt.isAfter(beforeCreation)).toBe(true);
      expect(savedUser!.timestamps.updatedAt.isAfter(beforeCreation)).toBe(true);
      expect(savedUser!.timestamps.createdAt.isBefore(afterCreation)).toBe(true);
      expect(savedUser!.timestamps.updatedAt.isBefore(afterCreation)).toBe(true);
      expect(savedUser!.lastLogin.isNever()).toBe(true);
    });
    it('should create unique user IDs for different registrations', async () => {
      // Arrange
      const { commandHandler, userRepository: repository } = setup();
      const command1 = createCommand();
      const command2 = createCommand();

      // Act
      await commandHandler.execute(command1);
      await commandHandler.execute(command2);

      // Assert
      const user1 = await repository.findByEmail(new Email(command1.email));
      const user2 = await repository.findByEmail(new Email(command2.email));
      expect(user1!.id.toValue()).not.toBe(user2!.id.toValue());
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

    it('should propagate failures when storing the integration event in the Outbox fails', async () => {
      // Arrange
      const { commandHandler, userRepository } = setup({ shouldFailOutbox: true });
      const command = createCommand();

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(InfrastructureException);
      // Verify that the user was not created (Transaction)
      const userExists = await userRepository.existsByEmail(new Email(command.email));
      expect(userExists).toBe(false);
    });

    it('should throw ApplicationException when EventBus publishing fails', async () => {
      // Arrange
      const { commandHandler, userRepository, outboxRepository } = setup({
        shouldFailEventBus: true,
      });
      const command = createCommand();

      // Act & Assert
      await expect(commandHandler.execute(command)).rejects.toThrow(ApplicationException);
      // Verify that the user was not created (Transaction)
      const userExists = await userRepository.existsByEmail(new Email(command.email));
      expect(userExists).toBe(false);
      // Verify that the integration event was not stored in the Outbox
      const outboxEvents = await outboxRepository.findAll();
      expect(outboxEvents).toHaveLength(0);
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
