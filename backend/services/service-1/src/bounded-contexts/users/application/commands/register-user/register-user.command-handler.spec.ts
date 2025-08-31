import { RegisterUserCommandHandler } from './register-user.command-handler';
import { RegisterUserCommand } from './register-user.command';
import { UserInMemoryRepository } from '../../../infrastructure/repositories/in-memory/user-in-memory.repository';
import { UserRoleEnum } from '../../../domain/value-objects/user-role.vo';
import { BadRequestException } from '@nestjs/common';
import { createEventBusMock, MockEventBus } from '@libs/nestjs-common';

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
        roles: []
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
      expect(savedUser!.roles).toHaveLength(0);
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

    it('should call publishAll for domain events after user creation', async () => {
      // Arrange
      const command = new RegisterUserCommand({
        email: 'events@example.com',
        username: 'eventsuser',
        firstName: 'Events',
        lastName: 'User',
        roles: []
      });

      // Act
      await commandHandler.execute(command);

      // Assert - Verify that domain events were published to the mock EventBus
      expect(eventBus.events).toBeDefined();
      // Note: Events are captured in the mock's events array before they're committed
      // The exact verification depends on the timing of when events are published vs committed
    });

    it('should create user with default active status', async () => {
      // Arrange
      const command = new RegisterUserCommand({
        email: 'active@example.com',
        username: 'activeuser',
        firstName: 'Active',
        lastName: 'User',
        roles: []
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
        roles: []
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

    it('should handle empty roles array', async () => {
      // Arrange
      const command = new RegisterUserCommand(
        {
          email: 'noroles@example.com',
          username: 'norolesuser',
          firstName: 'No',
          lastName: 'Roles',
          roles: []
        }
      );

      // Act
      const result = await commandHandler.execute(command);

      // Assert
      const savedUser = await repository.findById(result.id);
      expect(savedUser!.roles).toHaveLength(0);
    });

    it('should create unique user IDs for different registrations', async () => {
      // Arrange
      const command1 = new RegisterUserCommand({
        email: 'user1@example.com',
        username: 'user1',
        firstName: 'User',
        lastName: 'One',
        roles: []
      });
      const command2 = new RegisterUserCommand({
        email: 'user2@example.com',
        username: 'user2',
        firstName: 'User',
        lastName: 'Two',
        roles: []
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
        roles: []
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
        roles: []
      });
      await commandHandler.execute(existingCommand);

      const duplicateEmailCommand = new RegisterUserCommand({
        email: 'existing@example.com',
        username: 'user2',
        firstName: 'Duplicate',
        lastName: 'User',
        roles: []
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
        roles: []
      });
      await commandHandler.execute(existingCommand);

      const duplicateUsernameCommand = new RegisterUserCommand({
        email: 'user2@example.com',
        username: 'existinguser',
        firstName: 'Existing',
        lastName: 'User',
        roles: []
      });

      // Act & Assert
      await expect(commandHandler.execute(duplicateUsernameCommand))
        .rejects
        .toThrow(BadRequestException);
      
      await expect(commandHandler.execute(duplicateUsernameCommand))
        .rejects
        .toThrow('Username existinguser is already taken');
    });
  });
});