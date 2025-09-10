import { UserRegisteredDomainEventHandler } from './user-registered.domain-event-handler';
import { UserRegisteredDomainEvent } from '../../../domain/events/user-registered.domain-event';
import { Email } from '../../../domain/value-objects/email.vo';
import { Username } from '../../../domain/value-objects/username.vo';
import { UserRole } from '../../../domain/value-objects/user-role.vo';
import type { OutboxService } from '@libs/nestjs-common';
import { Topics } from '@libs/nestjs-common';

describe('UserRegisteredDomainEventHandler (Unit)', () => {
  let eventHandler: UserRegisteredDomainEventHandler;
  let mockOutboxService: jest.Mocked<OutboxService>;
  let storeEventSpy: jest.MockedFunction<OutboxService['storeEvent']>;

  beforeEach(() => {
    const storeEventMock = jest.fn();

    mockOutboxService = {
      storeEvent: storeEventMock,
      processOutboxEvents: jest.fn(),
      cleanupProcessedEvents: jest.fn(),
    } as unknown as jest.Mocked<OutboxService>;

    storeEventSpy = storeEventMock;
    eventHandler = new UserRegisteredDomainEventHandler(mockOutboxService);
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
      expect(storeEventSpy).toHaveBeenCalledTimes(1);
      expect(storeEventSpy).toHaveBeenCalledWith(
        Topics.USERS.events.USER_CREATED,
        Topics.USERS.topic,
        expect.stringContaining('"userId":"test-user-id"'),
      );

      const storedCall = storeEventSpy.mock.calls[0];
      const [eventType, topic, payload] = storedCall;
      expect(eventType).toBe(Topics.USERS.events.USER_CREATED);
      expect(topic).toBe('users');

      const publishedData = JSON.parse(payload);
      expect(publishedData.data.userId).toBe('test-user-id');
      expect(publishedData.data.email).toBe('test@example.com');
      expect(publishedData.data.username).toBe('testuser');
      expect(publishedData.data.role).toEqual('user');
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
      const storedCall = storeEventSpy.mock.calls[0];
      const [, , payload] = storedCall;
      const publishedData = JSON.parse(payload);

      expect(publishedData.data.email).toBe('test.user+tag@example-domain.com');
      expect(publishedData.data.username).toBe('user_name-123');
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
      const storedCall = storeEventSpy.mock.calls[0];
      const [eventType, topic, payload] = storedCall;
      const publishedEvent = JSON.parse(payload);

      expect(eventType).toBe(Topics.USERS.events.USER_CREATED);
      expect(topic).toBe(Topics.USERS.topic);
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
      expect(storeEventSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Cases', () => {
    it('should handle outbox service failures and rethrow error', async () => {
      // Arrange
      const failingOutboxService = {
        storeEvent: jest.fn().mockRejectedValue(new Error('Outbox service failed')),
        processOutboxEvents: jest.fn(),
        cleanupProcessedEvents: jest.fn(),
      } as unknown as jest.Mocked<OutboxService>;

      const failingEventHandler = new UserRegisteredDomainEventHandler(failingOutboxService);

      const event = new UserRegisteredDomainEvent({
        userId: 'failing-user-id',
        email: new Email('failing@example.com'),
        username: new Username('failing'),
        role: UserRole.user(),
      });

      // Act & Assert
      await expect(failingEventHandler.handle(event)).rejects.toThrow('Outbox service failed');
    });

    it('should propagate database errors from outbox service', async () => {
      // Arrange
      const failingOutboxService = {
        storeEvent: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        processOutboxEvents: jest.fn(),
        cleanupProcessedEvents: jest.fn(),
      } as unknown as jest.Mocked<OutboxService>;

      const failingEventHandler = new UserRegisteredDomainEventHandler(failingOutboxService);

      const event = new UserRegisteredDomainEvent({
        userId: 'network-error-user',
        email: new Email('network@example.com'),
        username: new Username('network'),
        role: UserRole.user(),
      });

      // Act & Assert
      await expect(failingEventHandler.handle(event)).rejects.toThrow('Database connection failed');
    });
  });
});
