import { UserDeleted_DeleteEmailVerification_DomainEventHandler } from './user-deleted_delete-email-verification.domain-event-handler';
import { UserDeleted_DomainEvent } from '@bc/auth/domain/events/user-deleted.domain-event';
import { createCommandBusMock, Id, NotFoundException } from '@libs/nestjs-common';
import { CommandBus } from '@nestjs/cqrs';


describe('UserDeleted_DeleteEmailVerification_DomainEventHandler', () => {
  const createEvent = () => new UserDeleted_DomainEvent(Id.random());

  const setup = (params: { shouldFailCommandBus?: boolean } = {}) => {
    const commandBus = createCommandBusMock({ shouldFail: params.shouldFailCommandBus });
    const handler = new UserDeleted_DeleteEmailVerification_DomainEventHandler(
      commandBus as unknown as CommandBus,
    );

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

  it('should swallow NotFoundException', async () => {
    const notFoundCommandBus = {
      execute: () => Promise.reject(new NotFoundException('email verification')),
    } as unknown as CommandBus;
    const handler = new UserDeleted_DeleteEmailVerification_DomainEventHandler(notFoundCommandBus);
    const event = createEvent();

    await expect(handler.handle(event)).resolves.not.toThrow();
  });
});
