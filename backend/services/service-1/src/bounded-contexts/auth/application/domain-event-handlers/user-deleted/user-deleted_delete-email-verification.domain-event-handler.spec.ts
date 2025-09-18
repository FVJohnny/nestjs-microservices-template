import { UserDeleted_DeleteEmailVerification_DomainEventHandler } from './user-deleted_delete-email-verification.domain-event-handler';
import { UserDeleted_DomainEvent } from '@bc/auth/domain/events/user-deleted.domain-event';
import { Id, MockCommandBus } from '@libs/nestjs-common';

describe('UserDeleted_DeleteEmailVerification_DomainEventHandler', () => {
  const createEvent = () => new UserDeleted_DomainEvent(Id.random());

  const setup = (params: { shouldFailCommandBus?: boolean } = {}) => {
    const commandBus = new MockCommandBus({ shouldFail: params.shouldFailCommandBus });
    const handler = new UserDeleted_DeleteEmailVerification_DomainEventHandler(commandBus);

    return { handler, commandBus };
  };

  it('should execute delete email verification command', async () => {
    const { handler, commandBus } = setup();
    const event = createEvent();

    await handler.handle(event);

    expect(commandBus.commands).toHaveLength(1);
    const command = commandBus.commands[0] as { userId: string };
    expect(command.userId).toBe(event.aggregateId.toValue());
  });

  it('errors thrown by the command bus are propagated', async () => {
    const { handler } = setup({ shouldFailCommandBus: true });
    const event = createEvent();

    await expect(handler.handle(event)).rejects.toThrow();
  });
});
