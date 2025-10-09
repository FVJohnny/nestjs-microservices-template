import { DeleteUser_CommandHandler } from './delete-user.command-handler';
import { DeleteUser_Command } from './delete-user.command';
import { User_InMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user.in-memory-repository';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { Id, InfrastructureException, MockEventBus, NotFoundException } from '@libs/nestjs-common';
import { UserDeleted_DomainEvent } from '@bc/auth/domain/events/user-deleted.domain-event';

describe('DeleteUser_CommandHandler', () => {
  const createCommand = ({ userId }: { userId?: string } = {}) =>
    new DeleteUser_Command({ userId: userId ?? Id.random().toValue() });

  const setup = async (
    params: {
      withUser?: boolean;
      shouldFailRepository?: boolean;
      shouldFailEventBus?: boolean;
    } = {},
  ) => {
    const { withUser = false, shouldFailRepository = false, shouldFailEventBus = false } = params;

    const repository = new User_InMemoryRepository(shouldFailRepository);
    const eventBus = new MockEventBus({ shouldFail: shouldFailEventBus });
    const handler = new DeleteUser_CommandHandler(repository, eventBus);

    let user: User | null = null;
    if (withUser) {
      user = User.random();
      await repository.save(user);
    }

    return { repository, eventBus, handler, user };
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
  });
});
