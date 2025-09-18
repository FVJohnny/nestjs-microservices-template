import { UserRegistered_SendIntegrationEvent_DomainEventHandler } from './user-registered_send-integration-event.domain-event-handler';
import { UserRegistered_DomainEvent } from '@bc/auth/domain/events/user-registered.domain-event';
import { Email } from '@bc/auth/domain/value-objects';
import type { UserCreated_IntegrationEvent } from '@libs/nestjs-common';
import {
  InfrastructureException,
  InMemoryIntegrationEventPublisher,
  InMemoryOutboxRepository,
  OutboxService,
  Topics,
} from '@libs/nestjs-common';
import { User } from '@bc/auth/domain/entities/user/user.entity';

describe('UserRegistered_SendIntegrationEvent_DomainEventHandler', () => {
  const createEventFromUser = (user: User) =>
    new UserRegistered_DomainEvent(user.id, user.email, user.username, user.role);

  // Setup factory
  const setup = (params: { shouldFailOutbox?: boolean } = {}) => {
    const { shouldFailOutbox = false } = params;

    const integrationEventPublisher = new InMemoryIntegrationEventPublisher(shouldFailOutbox);
    const outboxRepository = new InMemoryOutboxRepository(shouldFailOutbox);
    const outboxService = new OutboxService(outboxRepository, integrationEventPublisher);
    const eventHandler = new UserRegistered_SendIntegrationEvent_DomainEventHandler(outboxService);

    return { eventHandler, outboxRepository };
  };

  describe('Happy Path', () => {
    it('should publish integration event', async () => {
      // Arrange
      const { eventHandler, outboxRepository } = setup();
      const user = User.random();
      const event = createEventFromUser(user);

      // Act
      await eventHandler.handle(event);

      // Assert
      const [outboxEvent] = await outboxRepository.findAll();
      expect(outboxEvent.eventName).toBe(Topics.USERS.events.USER_CREATED);
      expect(outboxEvent.topic).toBe(Topics.USERS.topic);

      const payload = JSON.parse(outboxEvent.payload) as UserCreated_IntegrationEvent;
      expect(payload.userId).toBe(user.id.toValue());
      expect(payload.email).toBe(user.email.toValue());
      expect(payload.username).toBe(user.username.toValue());
      expect(payload.role).toEqual(user.role.toValue());
    });

    it('should handle special characters in email and username', async () => {
      // Arrange
      const { eventHandler, outboxRepository } = setup();
      const user = User.random({
        email: new Email('test.user+tag@example-domain.com'),
      });
      const event = createEventFromUser(user);

      // Act
      await eventHandler.handle(event);

      // Assert
      const [outboxEvent] = await outboxRepository.findAll();
      expect(outboxEvent.eventName).toBe(Topics.USERS.events.USER_CREATED);
      expect(outboxEvent.topic).toBe(Topics.USERS.topic);
      const payload = JSON.parse(outboxEvent.payload) as UserCreated_IntegrationEvent;

      expect(payload.userId).toBe(user.id.toValue());
      expect(payload.email).toBe(user.email.toValue());
      expect(payload.username).toBe(user.username.toValue());
      expect(payload.role).toEqual(user.role.toValue());
    });

    it('should handle multiple events sequentially', async () => {
      // Arrange
      const { eventHandler, outboxRepository } = setup();
      const users = [User.random(), User.random()];
      const events = users.map((user) => createEventFromUser(user));

      // Act
      for (const event of events) {
        await eventHandler.handle(event);
      }

      // Assert
      const outboxEvents = await outboxRepository.findAll();
      expect(outboxEvents).toHaveLength(2);

      const firstPayload = JSON.parse(outboxEvents[0].payload) as UserCreated_IntegrationEvent;
      expect(firstPayload.userId).toBe(users[0].id.toValue());
      expect(firstPayload.role).toBe(users[0].role.toValue());

      const secondPayload = JSON.parse(outboxEvents[1].payload) as UserCreated_IntegrationEvent;
      expect(secondPayload.userId).toBe(users[1].id.toValue());
      expect(secondPayload.role).toBe(users[1].role.toValue());
    });
  });

  describe('Error Cases', () => {
    it('should throw InfrastructureException when outbox fails', async () => {
      // Arrange
      const { eventHandler } = setup({ shouldFailOutbox: true });
      const user = User.random();
      const event = createEventFromUser(user);

      // Act & Assert
      await expect(eventHandler.handle(event)).rejects.toThrow(InfrastructureException);
    });
  });
});
