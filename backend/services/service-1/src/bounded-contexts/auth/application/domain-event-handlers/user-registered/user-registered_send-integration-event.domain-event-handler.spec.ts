import { UserRegistered_SendIntegrationEvent_DomainEventHandler } from './user-registered_send-integration-event.domain-event-handler';
import {
  UserRegisteredDomainEvent,
} from '../../../domain/events/user-registered.domain-event';
import { Email } from '../../../domain/value-objects';
import { Topics, UserCreatedIntegrationEvent, createOutboxServiceMock } from '@libs/nestjs-common';
import { User } from '../../../domain/entities/user/user.entity';

describe('UserRegistered_SendIntegrationEvent_DomainEventHandler', () => {

  const createEventFromUser = (user: User) =>
    new UserRegisteredDomainEvent({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });

  // Setup factory
  const setup = (params: { shouldFailOutbox?: boolean } = {}) => {
    const { shouldFailOutbox = false } = params;

    const mockOutboxService = createOutboxServiceMock({ shouldFail: shouldFailOutbox });
    const eventHandler = new UserRegistered_SendIntegrationEvent_DomainEventHandler(
      mockOutboxService as any,
    );

    return { mockOutboxService, eventHandler };
  };

  describe('Happy Path', () => {
    it('should publish integration event', async () => {
      // Arrange
      const { eventHandler, mockOutboxService } = setup();
      const user = User.random();
      const event = createEventFromUser(user);

      // Act
      await eventHandler.handle(event);

      // Assert
      expect(mockOutboxService.storedEvents).toHaveLength(1);

      const outboxEvent = mockOutboxService.storedEvents[0];
      expect(outboxEvent.eventName).toBe(Topics.USERS.events.USER_CREATED);
      expect(outboxEvent.topic).toBe(Topics.USERS.topic);

      const payload = JSON.parse(outboxEvent.payload) as UserCreatedIntegrationEvent;
      expect(payload.userId).toBe(user.id.toValue());
      expect(payload.email).toBe(user.email.toValue());
      expect(payload.username).toBe(user.username.toValue());
      expect(payload.role).toEqual(user.role.toValue());
    });

    it('should handle special characters in email and username', async () => {
      // Arrange
      const { eventHandler, mockOutboxService } = setup();
      const user = User.random({
        email: new Email('test.user+tag@example-domain.com'),
      });
      const event = createEventFromUser(user);

      // Act
      await eventHandler.handle(event);

      // Assert
      const outboxEvent = mockOutboxService.storedEvents[0];
      expect(outboxEvent.eventName).toBe(Topics.USERS.events.USER_CREATED);
      expect(outboxEvent.topic).toBe(Topics.USERS.topic);
      const payload = JSON.parse(outboxEvent.payload) as UserCreatedIntegrationEvent;

      expect(payload.userId).toBe(user.id.toValue());
      expect(payload.email).toBe(user.email.toValue());
      expect(payload.username).toBe(user.username.toValue());
      expect(payload.role).toEqual(user.role.toValue());
    });

    it('should handle multiple events sequentially', async () => {
      // Arrange
      const { eventHandler, mockOutboxService } = setup();
      const users = [User.random(), User.random()];
      const events = users.map((user) => createEventFromUser(user));

      // Act
      for (const event of events) {
        await eventHandler.handle(event);
      }

      // Assert
      expect(mockOutboxService.storedEvents).toHaveLength(2);

      const firstPayload = JSON.parse(mockOutboxService.storedEvents[0].payload) as UserCreatedIntegrationEvent;
      expect(firstPayload.userId).toBe(users[0].id.toValue());
      expect(firstPayload.role).toBe(users[0].role.toValue());

      const secondPayload = JSON.parse(mockOutboxService.storedEvents[1].payload) as UserCreatedIntegrationEvent;
      expect(secondPayload.userId).toBe(users[1].id.toValue());
      expect(secondPayload.role).toBe(users[1].role.toValue());
    });
  });

  describe('Error Cases', () => {
    it('should handle outbox service failures and rethrow error', async () => {
      // Arrange
      const { eventHandler } = setup({ shouldFailOutbox: true });
      const user = User.random();
      const event = createEventFromUser(user);

      // Act & Assert
      await expect(eventHandler.handle(event)).rejects.toThrow('OutboxService storeEvent failed');
    });
  });
});
