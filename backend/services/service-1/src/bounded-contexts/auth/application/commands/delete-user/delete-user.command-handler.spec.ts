import { DeleteUser_CommandHandler } from './delete-user.command-handler';
import { DeleteUser_Command } from './delete-user.command';
import { User_InMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user.in-memory-repository';
import { User } from '@bc/auth/domain/aggregates/user/user.aggregate';
import {
  Id,
  InfrastructureException,
  MockEventBus,
  NotFoundException,
  Outbox_InMemoryRepository,
  UserDeleted_IntegrationEvent,
  ApplicationException,
} from '@libs/nestjs-common';
import { UserDeleted_DomainEvent } from '@bc/auth/domain/aggregates/user/events/user-deleted.domain-event';

describe('DeleteUser_CommandHandler', () => {
  const createCommand = ({ userId }: { userId?: string } = {}) =>
    new DeleteUser_Command({ userId: userId ?? Id.random().toValue() });

  const setup = async (
    params: {
      withUser?: boolean;
      shouldFailRepository?: boolean;
      shouldFailEventBus?: boolean;
      shouldFailOutbox?: boolean;
    } = {},
  ) => {
    const {
      withUser = false,
      shouldFailRepository = false,
      shouldFailEventBus = false,
      shouldFailOutbox = false,
    } = params;

    const repository = new User_InMemoryRepository(shouldFailRepository);
    const eventBus = new MockEventBus({ shouldFail: shouldFailEventBus });
    const outboxRepository = new Outbox_InMemoryRepository(shouldFailOutbox);
    const handler = new DeleteUser_CommandHandler(repository, eventBus, outboxRepository);

    let user: User | null = null;
    if (withUser) {
      user = User.random();
      await repository.save(user);
    }

    return { repository, eventBus, outboxRepository, handler, user };
  };

  describe('Happy Path', () => {
    it('should delete an existing user', async () => {
      // Arrange
      const { handler, repository, user, eventBus } = await setup({ withUser: true });
      const command = createCommand({ userId: user!.id.toValue() });

      // Act
      await handler.execute(command);

      // Assert
      expect(await repository.findById(user!.id)).toBeNull();
      expect(await repository.exists(user!.id)).toBe(false);
      expect(eventBus.events).toHaveLength(1);
      const event = eventBus.events[0] as UserDeleted_DomainEvent;
      expect(event).toBeInstanceOf(UserDeleted_DomainEvent);
      expect(event.aggregateId.toValue()).toBe(user!.id.toValue());
    });
  });

  describe('Integration Events', () => {
    it('should store integration event in the outbox', async () => {
      // Arrange
      const { handler, outboxRepository, user } = await setup({ withUser: true });
      const command = createCommand({ userId: user!.id.toValue() });

      // Act
      await handler.execute(command);

      // Assert
      const outboxEvents = await outboxRepository.findAll();
      expect(outboxEvents).toHaveLength(1);

      const event = UserDeleted_IntegrationEvent.fromJSON(outboxEvents[0].payload.toJSON());
      expect(event.id).toBeDefined();
      expect(event.userId).toBe(user!.id.toValue());
      expect(event.email).toBe(user!.email.toValue());
      expect(event.username).toBe(user!.username.toValue());
      expect(event.occurredOn).toBeInstanceOf(Date);
    });

    it('should propagate failures when storing the integration event in the Outbox fails', async () => {
      // Arrange
      const { handler, repository, user } = await setup({
        withUser: true,
        shouldFailOutbox: true,
      });
      const command = createCommand({ userId: user!.id.toValue() });

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(InfrastructureException);

      // Verify transaction rollback: the user should still exist
      const stillExists = await repository.exists(user!.id);
      expect(stillExists).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      const { handler } = await setup();
      const command = createCommand();

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw InfrastructureException when repository fails', async () => {
      // Arrange
      const { handler } = await setup({ shouldFailRepository: true });
      const command = createCommand();

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(InfrastructureException);
    });

    it('should propagate event bus exceptions', async () => {
      // Arrange
      const { handler, repository, outboxRepository, user } = await setup({
        withUser: true,
        shouldFailEventBus: true,
      });
      const command = createCommand({ userId: user!.id.toValue() });

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ApplicationException);

      // Verify transaction rollback: the user should still exist
      const stillExists = await repository.exists(user!.id);
      expect(stillExists).toBe(true);

      // Verify that the integration event was not stored in the Outbox
      const outboxEvents = await outboxRepository.findAll();
      expect(outboxEvents).toHaveLength(0);
    });
  });
});
