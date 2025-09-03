import { UserRegisteredDomainEventHandler } from './user-registered.domain-event-handler';
import { UserRegisteredDomainEvent } from '../../../domain/events/user-registered.domain-event';
import { Email } from '../../../domain/value-objects/email.vo';
import { Username } from '../../../domain/value-objects/username.vo';
import { UserRole } from '../../../domain/value-objects/user-role.vo';
import {
  Topics,
  createIntegrationEventPublisherMock,
  MockIntegrationEventPublisher,
} from '@libs/nestjs-common';

describe('UserRegisteredDomainEventHandler (Unit)', () => {
  let eventHandler: UserRegisteredDomainEventHandler;
  let mockIntegrationEventPublisher: MockIntegrationEventPublisher;

  beforeEach(() => {
    mockIntegrationEventPublisher = createIntegrationEventPublisherMock({
      shouldFail: false,
    });
    eventHandler = new UserRegisteredDomainEventHandler(
      mockIntegrationEventPublisher,
    );
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
      expect(mockIntegrationEventPublisher.publishedEvents).toHaveLength(1);

      const publishedEvent = mockIntegrationEventPublisher.publishedEvents[0];
      expect(publishedEvent.topic).toBe('users');

      const publishedData = publishedEvent.message;
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
      const publishedEvent = mockIntegrationEventPublisher.publishedEvents[0];
      const publishedData = publishedEvent.message;

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
      const publishedEvent =
        mockIntegrationEventPublisher.publishedEvents[0].message;
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
      expect(mockIntegrationEventPublisher.publishedEvents).toHaveLength(2);
    });
  });

  describe('Error Cases', () => {
    it('should handle integration event publisher failures and rethrow error', async () => {
      // Arrange
      const failingPublisher = createIntegrationEventPublisherMock({
        shouldFail: true,
      });
      const failingEventHandler = new UserRegisteredDomainEventHandler(
        failingPublisher,
      );

      const event = new UserRegisteredDomainEvent({
        userId: 'failing-user-id',
        email: new Email('failing@example.com'),
        username: new Username('failing'),
        role: UserRole.user(),
      });

      // Act & Assert
      await expect(failingEventHandler.handle(event)).rejects.toThrow(
        'IntegrationEventPublisher publish failed',
      );
    });

    it('should log error and rethrow when publisher throws', async () => {
      // Arrange
      const failingPublisher = createIntegrationEventPublisherMock({
        shouldFail: true,
      });
      const failingEventHandler = new UserRegisteredDomainEventHandler(
        failingPublisher,
      );

      const event = new UserRegisteredDomainEvent({
        userId: 'network-error-user',
        email: new Email('network@example.com'),
        username: new Username('network'),
        role: UserRole.user(),
      });

      // Act & Assert
      await expect(failingEventHandler.handle(event)).rejects.toThrow(
        'IntegrationEventPublisher publish failed',
      );
    });

    it('should handle timeout errors from integration event publisher', async () => {
      // Arrange
      const failingPublisher = createIntegrationEventPublisherMock({
        shouldFail: true,
      });
      const failingEventHandler = new UserRegisteredDomainEventHandler(
        failingPublisher,
      );

      const event = new UserRegisteredDomainEvent({
        userId: 'timeout-user',
        email: new Email('timeout@example.com'),
        username: new Username('timeout'),
        role: UserRole.user(),
      });

      // Act & Assert
      await expect(failingEventHandler.handle(event)).rejects.toThrow(
        'IntegrationEventPublisher publish failed',
      );
    });
  });
});
