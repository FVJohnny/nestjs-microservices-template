import { RegisterUserCommandHandler } from './register-user.command-handler';
import { RegisterUserCommand } from './register-user.command';
import { UserInMemoryRepository } from '../../../infrastructure/repositories/in-memory/user-in-memory.repository';
import { UserRole, UserRoleEnum } from '../../../domain/value-objects/user-role.vo';
import { BadRequestException } from '@nestjs/common';
import { createEventBusMock, MockEventBus } from '@libs/nestjs-common';
import { UserRegisteredEvent } from '../../../domain/events/user-registered.event';

describe('RegisterUserCommandHandler (Unit)', () => {
  let commandHandler: RegisterUserCommandHandler;
  let repository: UserInMemoryRepository;
  let eventBus: MockEventBus;

  beforeEach(() => {
    repository = new UserInMemoryRepository();
    eventBus = createEventBusMock({ shouldFail: false });
    commandHandler = new RegisterUserCommandHandler(repository, eventBus as any);
  });

  describe('Happy Path', () => {
    it('should successfully register a new user with complete information', async () => {
      // Arrange
      const command = new RegisterUserCommand({
        email: 'john.doe@example.com',
        username: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        roles: [UserRoleEnum.USER]
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
      expect(savedUser!.profile.firstName.toValue()).toBe('John');
      expect(savedUser!.profile.lastName.toValue()).toBe('Doe');
      expect(savedUser!.roles).toHaveLength(1);
      expect(savedUser!.roles[0].toValue()).toBe(UserRoleEnum.USER);
    });

    it('should register user with minimal required fields only', async () => {
      // Arrange
      const command = new RegisterUserCommand({
        email: 'minimal@example.com',
        username: 'minimaluser',
        firstName: '',
        lastName: '',
        roles: [UserRoleEnum.USER] // At least one role is now required
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      expect(result.id).toBeDefined();

      const savedUser = await repository.findById(result.id);
      expect(savedUser!.email.toValue()).toBe('minimal@example.com');
      expect(savedUser!.username.toValue()).toBe('minimaluser');
      expect(savedUser!.profile.firstName.toValue()).toBe('');
      expect(savedUser!.profile.lastName.toValue()).toBe('');
      expect(savedUser!.roles).toHaveLength(1);
      expect(savedUser!.roles[0].toValue()).toBe(UserRoleEnum.USER);
    });

    it('should assign multiple roles correctly', async () => {
      // Arrange
      const command = new RegisterUserCommand({
        email: 'multirole@example.com',
        username: 'multiroleuser',
        firstName: 'Multi',
        lastName: 'Role',
        roles: [UserRoleEnum.ADMIN, UserRoleEnum.USER, UserRoleEnum.MODERATOR]
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      const savedUser = await repository.findById(result.id);
      expect(savedUser!.roles).toHaveLength(3);
      
      const roleValues = savedUser!.roles.map(r => r.toValue());
      expect(roleValues).toContain(UserRoleEnum.ADMIN);
      expect(roleValues).toContain(UserRoleEnum.USER);
      expect(roleValues).toContain(UserRoleEnum.MODERATOR);
    });

    it('should publish UserRegisteredEvent after user creation', async () => {
      // Arrange
      const command = new RegisterUserCommand({
        email: 'events@example.com',
        username: 'eventsuser',
        firstName: 'Events',
        lastName: 'User',
        roles: [UserRoleEnum.USER, UserRoleEnum.ADMIN]
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert - Verify that domain events were published to the mock EventBus
      expect(eventBus.events).toBeDefined();
      expect(eventBus.events).toHaveLength(1);
      
      // Verify the exact event type
      const publishedEvent = eventBus.events[0] as UserRegisteredEvent;
      expect(publishedEvent).toBeInstanceOf(UserRegisteredEvent);
      
      // Verify event properties match exactly with the created user
      expect(publishedEvent.aggregateId).toBe(result.id);
      expect(publishedEvent.email.toValue()).toBe('events@example.com');
      expect(publishedEvent.username.toValue()).toBe('eventsuser');
      expect(publishedEvent.occurredOn).toBeInstanceOf(Date);

      
      // Verify roles are correct
      expect(publishedEvent.roles).toHaveLength(2);
      const roleValues = publishedEvent.roles.map(r => r.toValue());
      expect(roleValues).toContain(UserRoleEnum.USER);
      expect(roleValues).toContain(UserRoleEnum.ADMIN);
    });

    it('should create user with default active status', async () => {
      // Arrange
      const command = new RegisterUserCommand({
        email: 'active@example.com',
        username: 'activeuser',
        firstName: 'Active',
        lastName: 'User',
        roles: [UserRole.user().toValue()]
      });

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      const savedUser = await repository.findById(result.id);
      expect(savedUser!.isActive()).toBe(true);
    });

    it('should set proper timestamps on user creation', async () => {
      // Arrange
      const command = new RegisterUserCommand({
        email: 'timestamp@example.com',
        username: 'timestampuser',
        firstName: 'Timestamp',
        lastName: 'User',
        roles: [UserRole.user().toValue()]
      });
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
      const command1 = new RegisterUserCommand({
        email: 'user1@example.com',
        username: 'user1',
        firstName: 'User',
        lastName: 'One',
        roles: [UserRole.user().toValue()]
      });
      const command2 = new RegisterUserCommand({
        email: 'user2@example.com',
        username: 'user2',
        firstName: 'User',
        lastName: 'Two',
        roles: [UserRole.user().toValue()]
      });

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
    it('should handle EventBus publishing failures gracefully', async () => {
      // Arrange
      const failingEventBus = createEventBusMock({ shouldFail: true });
      const handlerWithFailingEventBus = new RegisterUserCommandHandler(repository, failingEventBus as any);
      
      const command = new RegisterUserCommand({
        email: 'failing@example.com',
        username: 'failinguser',
        firstName: 'Failing',
        lastName: 'User',
        roles: [UserRole.user().toValue()]
      });

      // Act & Assert
      await expect(handlerWithFailingEventBus.execute(command))
        .rejects
        .toThrow('EventBus publishAll failed');
    });

    it('should throw BadRequestException when email already exists', async () => {
      // Arrange
      const existingCommand = new RegisterUserCommand({
        email: 'existing@example.com',
        username: 'user1',
        firstName: 'Existing',
        lastName: 'User',
        roles: [UserRole.user().toValue()]
      });
      await commandHandler.execute(existingCommand);

      const duplicateEmailCommand = new RegisterUserCommand({
        email: 'existing@example.com',
        username: 'user2',
        firstName: 'Duplicate',
        lastName: 'User',
        roles: [UserRole.user().toValue()]
      });

      // Act & Assert
      await expect(commandHandler.execute(duplicateEmailCommand))
        .rejects
        .toThrow(BadRequestException);
      
      await expect(commandHandler.execute(duplicateEmailCommand))
        .rejects
        .toThrow('Email existing@example.com is already registered');
    });

    it('should throw BadRequestException when username already exists', async () => {
      // Arrange
      const existingCommand = new RegisterUserCommand({
        email: 'user1@example.com',
        username: 'existinguser',
        firstName: 'Existing',
        lastName: 'User',
        roles: [UserRole.user().toValue()]
      });
      await commandHandler.execute(existingCommand);

      const duplicateUsernameCommand = new RegisterUserCommand({
        email: 'user2@example.com',
        username: 'existinguser',
        firstName: 'Existing',
        lastName: 'User',
        roles: [UserRole.user().toValue()]
      });

      // Act & Assert
      await expect(commandHandler.execute(duplicateUsernameCommand))
        .rejects
        .toThrow(BadRequestException);
      
      await expect(commandHandler.execute(duplicateUsernameCommand))
        .rejects
        .toThrow('Username existinguser is already taken');
    });

    it('should throw error when empty roles array is provided', async () => {
      // Arrange
      const command = new RegisterUserCommand({
        email: 'noroles@example.com',
        username: 'norolesuser',
        firstName: 'No',
        lastName: 'Roles',
        roles: []
      });

      // Act & Assert
      await expect(commandHandler.execute(command))
        .rejects
        .toThrow();
    });
  });
});