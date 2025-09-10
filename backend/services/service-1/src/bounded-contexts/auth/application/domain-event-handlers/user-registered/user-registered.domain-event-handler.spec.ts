import { UserRegisteredDomainEventHandler } from './user-registered.domain-event-handler';
import { UserRegisteredDomainEvent } from '../../../domain/events/user-registered.domain-event';
import { Email } from '../../../domain/value-objects/email.vo';
import { Username } from '../../../domain/value-objects/username.vo';
import { UserRole } from '../../../domain/value-objects/user-role.vo';
import { Topics, createOutboxServiceMock, type MockOutboxService, createCommandBusMock, type MockCommandBus } from '@libs/nestjs-common';
import { CreateEmailVerificationCommand } from '../../commands/create-email-verification/create-email-verification.command';

describe('UserRegisteredDomainEventHandler (Unit)', () => {
  let eventHandler: UserRegisteredDomainEventHandler;
  let mockOutboxService: MockOutboxService;
  let mockCommandBus: MockCommandBus;

  beforeEach(() => {
    mockOutboxService = createOutboxServiceMock({ shouldFail: false });
    mockCommandBus = createCommandBusMock({ shouldFail: false });
    eventHandler = new UserRegisteredDomainEventHandler(mockOutboxService as any, mockCommandBus as any);
  });

  describe('Happy Path', () => {
    it('should handle UserRegisteredEvent and publish integration event successfully', async () => {
      // Arrange
      const event = new UserRegisteredDomainEvent({
        userId: 'test-user-id',
        email: new Email('test@example.com'),
        username: new Username('testuser'),
        role: UserRole.user(),
      });

      // Act
      await eventHandler.handle(event);

      // Assert
      expect(mockOutboxService.storedEvents).toHaveLength(1);
      
      const storedEvent = mockOutboxService.storedEvents[0];
      expect(storedEvent.eventType).toBe(Topics.USERS.events.USER_CREATED);
      expect(storedEvent.topic).toBe('users');
      expect(storedEvent.payload).toContain('"userId":"test-user-id"');

      const publishedData = JSON.parse(storedEvent.payload);
      expect(publishedData.data.userId).toBe('test-user-id');
      expect(publishedData.data.email).toBe('test@example.com');
      expect(publishedData.data.username).toBe('testuser');
      expect(publishedData.data.role).toEqual('user');

      // Verify command bus was called to create email verification
      expect(mockCommandBus.commands).toHaveLength(1);
      const executedCommand = mockCommandBus.commands[0] as CreateEmailVerificationCommand;
      expect(executedCommand).toBeInstanceOf(CreateEmailVerificationCommand);
      expect(executedCommand.userId).toBe('test-user-id');
      expect(executedCommand.email).toBe('test@example.com');
    });

    it('should handle special characters in email and username', async () => {
      // Arrange
      const event = new UserRegisteredDomainEvent({
        userId: 'special-chars-user',
        email: new Email('test.user+tag@example-domain.com'),
        username: new Username('user_name-123'),
        role: UserRole.user(),
      });

      // Act
      await eventHandler.handle(event);

      // Assert
      const storedEvent = mockOutboxService.storedEvents[0];
      const publishedData = JSON.parse(storedEvent.payload);


      expect(publishedData.data.userId).toBe('special-chars-user');
      expect(publishedData.data.email).toBe('test.user+tag@example-domain.com');
      expect(publishedData.data.username).toBe('user_name-123');

      // Verify command bus was called with special characters
      expect(mockCommandBus.commands).toHaveLength(1);
      const executedCommand = mockCommandBus.commands[0] as CreateEmailVerificationCommand;
      expect(executedCommand.userId).toBe('special-chars-user');
      expect(executedCommand.email).toBe('test.user+tag@example-domain.com');
    });

    it('should publish UserCreatedIntegrationEvent', async () => {
      // Arrange
      const event = new UserRegisteredDomainEvent({
        userId: 'integration-event-test',
        email: new Email('integration@example.com'),
        username: new Username('integration'),
        role: UserRole.user(),
      });

      // Act
      await eventHandler.handle(event);

      // Assert
      const storedEvent = mockOutboxService.storedEvents[0];
      const publishedEvent = JSON.parse(storedEvent.payload);

      expect(storedEvent.eventType).toBe(Topics.USERS.events.USER_CREATED);
      expect(storedEvent.topic).toBe(Topics.USERS.topic);
      expect(publishedEvent.topic).toBe(Topics.USERS.topic);
      expect(publishedEvent.name).toEqual(Topics.USERS.events.USER_CREATED);
      expect(publishedEvent.version).toBeDefined();
      expect(publishedEvent.occurredOn).toBeDefined();

      expect(publishedEvent.metadata).toBeDefined();
      expect(publishedEvent.metadata.id).toBeDefined();
      expect(publishedEvent.metadata.causationId).toEqual(event.metadata.id);
      expect(publishedEvent.metadata.correlationId).toBeDefined();
      expect(publishedEvent.metadata.userId).toBeDefined();

      expect(publishedEvent.data).toBeDefined();
      expect(publishedEvent.data.userId).toBe('integration-event-test');
      expect(publishedEvent.data.email).toBe('integration@example.com');
      expect(publishedEvent.data.username).toBe('integration');
      expect(publishedEvent.data.role).toEqual('user');
    });

    it('should handle multiple events sequentially', async () => {
      // Arrange
      const events = [
        new UserRegisteredDomainEvent({
          userId: 'user-1',
          email: new Email('user1@example.com'),
          username: new Username('user1'),
          role: UserRole.user(),
        }),
        new UserRegisteredDomainEvent({
          userId: 'user-2',
          email: new Email('user2@example.com'),
          username: new Username('user2'),
          role: UserRole.admin(),
        }),
      ];

      // Act
      for (const event of events) {
        await eventHandler.handle(event);
      }

      // Assert
      expect(mockOutboxService.storedEvents).toHaveLength(2);

      // Verify both commands were executed
      expect(mockCommandBus.commands).toHaveLength(2);
    });
  });

  describe('Email Verification Command Execution', () => {
    it('should execute CreateEmailVerificationCommand with correct user data', async () => {
      // Arrange
      const event = new UserRegisteredDomainEvent({
        userId: 'command-test-user',
        email: new Email('command.test@example.com'),
        username: new Username('commandtester'),
        role: UserRole.admin(),
      });

      // Act
      await eventHandler.handle(event);

      // Assert
      expect(mockCommandBus.commands).toHaveLength(1);
      const command = mockCommandBus.commands[0] as CreateEmailVerificationCommand;
      
      expect(command).toBeInstanceOf(CreateEmailVerificationCommand);
      expect(command.userId).toBe('command-test-user');
      expect(command.email).toBe('command.test@example.com');
    });

    it('should execute CreateEmailVerificationCommand for admin users', async () => {
      // Arrange
      const event = new UserRegisteredDomainEvent({
        userId: 'admin-user-123',
        email: new Email('admin@company.com'),
        username: new Username('admin'),
        role: UserRole.admin(),
      });

      // Act
      await eventHandler.handle(event);

      // Assert
      expect(mockCommandBus.commands).toHaveLength(1);
      const command = mockCommandBus.commands[0] as CreateEmailVerificationCommand;
      
      expect(command.userId).toBe('admin-user-123');
      expect(command.email).toBe('admin@company.com');
    });

    it('should handle command bus execution failure gracefully', async () => {
      // Arrange
      const failingCommandBus = createCommandBusMock({ shouldFail: true });
      const failingHandler = new UserRegisteredDomainEventHandler(mockOutboxService as any, failingCommandBus as any);
      
      const event = new UserRegisteredDomainEvent({
        userId: 'failing-user',
        email: new Email('failing@example.com'),
        username: new Username('failing'),
        role: UserRole.user(),
      });

      // Act & Assert
      await expect(failingHandler.handle(event)).rejects.toThrow('CommandBus execute failed');
    });
  });

  describe('Error Cases', () => {
    it('should handle outbox service failures and rethrow error', async () => {
      // Arrange
      const failingOutboxService = createOutboxServiceMock({ shouldFail: true });
      const failingMockCommandBus = createCommandBusMock({ shouldFail: false });
      const failingEventHandler = new UserRegisteredDomainEventHandler(failingOutboxService as any, failingMockCommandBus as any);

      const event = new UserRegisteredDomainEvent({
        userId: 'failing-user-id',
        email: new Email('failing@example.com'),
        username: new Username('failing'),
        role: UserRole.user(),
      });

      // Act & Assert
      await expect(failingEventHandler.handle(event)).rejects.toThrow('OutboxService storeEvent failed');
    });

    it('should propagate database errors from outbox service', async () => {
      // Arrange
      const failingOutboxService = createOutboxServiceMock({ shouldFail: true });
      const failingMockCommandBus = createCommandBusMock({ shouldFail: false });
      const failingEventHandler = new UserRegisteredDomainEventHandler(failingOutboxService as any, failingMockCommandBus as any);

      const event = new UserRegisteredDomainEvent({
        userId: 'network-error-user',
        email: new Email('network@example.com'),
        username: new Username('network'),
        role: UserRole.user(),
      });

      // Act & Assert
      await expect(failingEventHandler.handle(event)).rejects.toThrow('OutboxService storeEvent failed');
    });
  });
});
