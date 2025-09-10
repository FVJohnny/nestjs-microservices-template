import { RegisterUserCommandHandler } from './register-user.command-handler';
import { RegisterUserCommand } from './register-user.command';
import { UserInMemoryRepository } from '../../../infrastructure/repositories/in-memory/user-in-memory.repository';
import type { EventBus } from '@nestjs/cqrs';
import { UserRole, UserRoleEnum } from '../../../domain/value-objects/user-role.vo';
import type { MockEventBus } from '@libs/nestjs-common';
import { AlreadyExistsException, createEventBusMock } from '@libs/nestjs-common';
import { UserRegisteredDomainEvent } from '../../../domain/events/user-registered.domain-event';
describe('RegisterUserCommandHandler (Unit)', () => {
  let commandHandler: RegisterUserCommandHandler;
  let repository: UserInMemoryRepository;
  let eventBus: MockEventBus;
  beforeEach(() => {
    repository = new UserInMemoryRepository();
    eventBus = createEventBusMock({ shouldFail: false });
    commandHandler = new RegisterUserCommandHandler(repository, eventBus as unknown as EventBus);
  });
  describe('Happy Path', () => {
    it('should successfully register a new user with complete information', async () => {
      // Arrange
      const command = new RegisterUserCommand({
        email: 'john.doe@example.com',
        username: 'johndoe',
        password: 'TestPassword123!',
        role: UserRoleEnum.USER,
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
      const command = new RegisterUserCommand({
        email: 'minimal@example.com',
        username: 'minimaluser',
        password: 'TestPassword123!',
        role: UserRoleEnum.USER, // At least one role is now required
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
      const command = new RegisterUserCommand({
        email: 'events@example.com',
        username: 'eventsuser',
        password: 'TestPassword123!',
        role: UserRoleEnum.ADMIN,
      });
      // Act
      const result = await commandHandler.execute(command);
      // Assert - Verify that domain events were published to the mock EventBus
      expect(eventBus.events).toBeDefined();
      expect(eventBus.events).toHaveLength(1);
      // Verify the exact event type
      const publishedEvent = eventBus.events[0] as UserRegisteredDomainEvent;
      expect(publishedEvent).toBeInstanceOf(UserRegisteredDomainEvent);
      // Verify event properties match exactly with the created user
      expect(publishedEvent.aggregateId).toBe(result.id);
      expect(publishedEvent.email.toValue()).toBe('events@example.com');
      expect(publishedEvent.username.toValue()).toBe('eventsuser');
      expect(publishedEvent.occurredOn).toBeInstanceOf(Date);
      // Verify role is correct
      expect(publishedEvent.role.toValue()).toBe(UserRoleEnum.ADMIN);
    });
    it('should create user with email-verification-pending status', async () => {
      // Arrange
      const command = new RegisterUserCommand({
        email: 'active@example.com',
        username: 'activeuser',
        password: 'TestPassword123!',
        role: UserRole.user().toValue(),
      });
      // Act
      const result = await commandHandler.execute(command);
      // Assert
      const savedUser = await repository.findById(result.id);
      expect(savedUser!.isEmailVerificationPending()).toBe(true);
    });
    it('should set proper timestamps on user creation', async () => {
      // Arrange
      const command = new RegisterUserCommand({
        email: 'timestamp@example.com',
        username: 'timestampuser',
        password: 'TestPassword123!',
        role: UserRole.user().toValue(),
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
        password: 'TestPassword123!',
        role: UserRole.user().toValue(),
      });
      const command2 = new RegisterUserCommand({
        email: 'user2@example.com',
        username: 'user2',
        password: 'TestPassword123!',
        role: UserRole.user().toValue(),
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
      const handlerWithFailingEventBus = new RegisterUserCommandHandler(
        repository,
        failingEventBus as unknown as EventBus,
      );
      const command = new RegisterUserCommand({
        email: 'failing@example.com',
        username: 'failinguser',
        password: 'TestPassword123!',
        role: UserRole.user().toValue(),
      });
      // Act & Assert
      await expect(handlerWithFailingEventBus.execute(command)).rejects.toThrow(
        'EventBus publishAll failed',
      );
    });
    it('should throw BadRequestException when email already exists', async () => {
      // Arrange
      const existingCommand = new RegisterUserCommand({
        email: 'existing@example.com',
        username: 'user1',
        password: 'TestPassword123!',
        role: UserRole.user().toValue(),
      });
      await commandHandler.execute(existingCommand);
      const duplicateEmailCommand = new RegisterUserCommand({
        email: 'existing@example.com',
        username: 'user2',
        password: 'TestPassword123!',
        role: UserRole.user().toValue(),
      });
      // Act & Assert
      await expect(commandHandler.execute(duplicateEmailCommand)).rejects.toThrow(
        AlreadyExistsException,
      );
    });
    it('should throw BadRequestException when username already exists', async () => {
      // Arrange
      const existingCommand = new RegisterUserCommand({
        email: 'user1@example.com',
        username: 'existinguser',
        password: 'TestPassword123!',
        role: UserRole.user().toValue(),
      });
      await commandHandler.execute(existingCommand);
      const duplicateUsernameCommand = new RegisterUserCommand({
        email: 'user2@example.com',
        username: 'existinguser',
        password: 'TestPassword123!',
        role: UserRole.user().toValue(),
      });
      // Act & Assert
      await expect(commandHandler.execute(duplicateUsernameCommand)).rejects.toThrow(
        AlreadyExistsException,
      );
    });
  });
});
