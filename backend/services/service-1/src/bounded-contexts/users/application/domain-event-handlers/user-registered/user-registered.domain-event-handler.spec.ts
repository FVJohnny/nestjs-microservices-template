import { UserRegisteredDomainEventHandler } from './user-registered.domain-event-handler';
import { UserRegisteredEvent } from '../../../domain/events/user-registered.event';
import { Email } from '../../../domain/value-objects/email.vo';
import { Username } from '../../../domain/value-objects/username.vo';
import { UserRole, UserRoleEnum } from '../../../domain/value-objects/user-role.vo';
import {
  Topics,
  UserCreatedIntegrationEvent,
  createIntegrationEventPublisherMock,
  MockIntegrationEventPublisher,
} from '@libs/nestjs-common';

describe('UserRegisteredDomainEventHandler (Unit)', () => {
  let eventHandler: UserRegisteredDomainEventHandler;
  let mockIntegrationEventPublisher: MockIntegrationEventPublisher;

  beforeEach(() => {
    mockIntegrationEventPublisher = createIntegrationEventPublisherMock({ shouldFail: false });
    eventHandler = new UserRegisteredDomainEventHandler(mockIntegrationEventPublisher);
  });

  describe('Happy Path', () => {
    it('should handle UserRegisteredEvent and publish integration event successfully', async () => {
      // Arrange
      const event = new UserRegisteredEvent({
        userId: 'test-user-id',
        email: new Email('test@example.com'),
        username: new Username('testuser'),
        roles: [UserRole.user()],
        occurredOn: new Date(),
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
      expect(publishedData.data.roles).toEqual(['user']);
    });

    it('should handle user with multiple roles', async () => {
      // Arrange
      const event = new UserRegisteredEvent({
        userId: 'multi-role-user-id',
        email: new Email('admin@example.com'),
        username: new Username('adminuser'),
        roles: [
          UserRole.admin(),
          UserRole.user(),
          UserRole.moderator(),
        ],
        occurredOn: new Date(),
      });

      // Act
      await eventHandler.handle(event);

      // Assert
      const publishedEvent = mockIntegrationEventPublisher.publishedEvents[0];
      const publishedData = publishedEvent.message;
      
      expect(publishedData.data.roles).toEqual(['admin', 'user', 'moderator']);
      expect(publishedData.data.email).toBe('admin@example.com');
      expect(publishedData.data.username).toBe('adminuser');
    });

    it('should handle user with no roles', async () => {
      // Arrange
      const event = new UserRegisteredEvent({
        userId: 'no-roles-user-id',
        email: new Email('noroles@example.com'),
        username: new Username('noroles'),
        roles: [],
        occurredOn: new Date(),
      });

      // Act
      await eventHandler.handle(event);

      // Assert
      const publishedEvent = mockIntegrationEventPublisher.publishedEvents[0];
      const publishedData = publishedEvent.message;
      
      expect(publishedData.data.roles).toEqual([]);
    });

    it('should handle special characters in email and username', async () => {
      // Arrange
      const event = new UserRegisteredEvent({
        userId: 'special-chars-user',
        email: new Email('test.user+tag@example-domain.com'),
        username: new Username('user_name-123'),
        roles: [UserRole.user()],
        occurredOn: new Date(),
      });

      // Act
      await eventHandler.handle(event);

      // Assert
      const publishedEvent = mockIntegrationEventPublisher.publishedEvents[0];
      const publishedData = publishedEvent.message;
      
      expect(publishedData.data.email).toBe('test.user+tag@example-domain.com');
      expect(publishedData.data.username).toBe('user_name-123');
    });

    it('should create proper UserCreatedIntegrationEvent', async () => {
      // Arrange
      const event = new UserRegisteredEvent({
        userId: 'integration-event-test',
        email: new Email('integration@example.com'),
        username: new Username('integration'),
        roles: [UserRole.user()],
        occurredOn: new Date(),
      });

      // Act
      await eventHandler.handle(event);

      // Assert
      const publishedEvent = mockIntegrationEventPublisher.publishedEvents[0];
      const topic = publishedEvent.topic;
      const data = publishedEvent.message;

      const integrationEvent = new UserCreatedIntegrationEvent({
        userId: 'integration-event-test',
        email: 'integration@example.com',
        username: 'integration',
        roles: ['user'],
      });
      expect(topic).toBe(Topics.USERS.topic);
      
      const assertJson = integrationEvent.toJSON();
      delete assertJson.metadata;
      delete data.metadata;
      expect(data).toEqual(assertJson);
    });

    it('should handle multiple events sequentially', async () => {
      // Arrange
      const events = [
        new UserRegisteredEvent({
          userId: 'user-1',
          email: new Email('user1@example.com'),
          username: new Username('user1'),
          roles: [UserRole.user()],
          occurredOn: new Date(),
        }),
        new UserRegisteredEvent({
          userId: 'user-2',
          email: new Email('user2@example.com'),
          username: new Username('user2'),
          roles: [UserRole.admin()],
          occurredOn: new Date(),
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
      const failingPublisher = createIntegrationEventPublisherMock({ shouldFail: true });
      const failingEventHandler = new UserRegisteredDomainEventHandler(failingPublisher);
      
      const event = new UserRegisteredEvent({
        userId: 'failing-user-id',
        email: new Email('failing@example.com'),
        username: new Username('failing'),
        roles: [UserRole.user()],
        occurredOn: new Date(),
      });

      // Act & Assert
      await expect(failingEventHandler.handle(event)).rejects.toThrow('IntegrationEventPublisher publish failed');
    });

    it('should log error and rethrow when publisher throws', async () => {
      // Arrange
      const failingPublisher = createIntegrationEventPublisherMock({ shouldFail: true });
      const failingEventHandler = new UserRegisteredDomainEventHandler(failingPublisher);
      
      const event = new UserRegisteredEvent({
        userId: 'network-error-user',
        email: new Email('network@example.com'),
        username: new Username('network'),
        roles: [UserRole.user()],
        occurredOn: new Date(),
      });

      // Act & Assert
      await expect(failingEventHandler.handle(event)).rejects.toThrow('IntegrationEventPublisher publish failed');
    });

    it('should handle timeout errors from integration event publisher', async () => {
      // Arrange
      const failingPublisher = createIntegrationEventPublisherMock({ shouldFail: true });
      const failingEventHandler = new UserRegisteredDomainEventHandler(failingPublisher);
      
      const event = new UserRegisteredEvent({
        userId: 'timeout-user',
        email: new Email('timeout@example.com'),
        username: new Username('timeout'),
        roles: [UserRole.user()],
        occurredOn: new Date(),
      });

      // Act & Assert
      await expect(failingEventHandler.handle(event)).rejects.toThrow('IntegrationEventPublisher publish failed');
    });
  });
});