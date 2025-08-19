import { RegisterChannelCommandHandler } from './register-channel.command-handler';
import { RegisterChannelCommand } from './register-channel.command';
import type { RegisterChannelCommandProps } from './register-channel.command';
import { InMemoryChannelRepository } from '../../../infrastructure/repositories/in-memory/in-memory-channel.repository';
import { ChannelRegisteredDomainEvent } from '../../../domain/events/channel-registered.domain-event';
import { Channel } from '../../../domain/entities/channel.entity';
import { ICommandHandler, CqrsModule } from '@nestjs/cqrs';
import { fail } from 'assert';
import { createTestingModule } from '../../../../../testing';


async function executeCommand(
  handler: ICommandHandler | undefined,
  overrides: Partial<RegisterChannelCommandProps> = {},
) {
  if (!handler) throw Error("Command Handler is undefined!!")

  const cmdProps: RegisterChannelCommandProps = {
    channelType: overrides.channelType ?? 'telegram',
    name: overrides.name ?? 'My Channel',
    userId: overrides.userId ?? 'user-1',
    connectionConfig: overrides.connectionConfig ?? { token: 'abc' },
  };
  const cmd = new RegisterChannelCommand(cmdProps);
  const cmdResult = await handler.execute(cmd);

  const checkRepoEntityIsCorrect = (repoEntity: Channel | null) => {
    expect(repoEntity).toBeTruthy();
    expect(repoEntity?.name).toBe(cmdProps.name);
    expect(repoEntity?.channelType.toString()).toBe(cmdProps.channelType);
    expect(repoEntity?.userId).toBe(cmdProps.userId);
    expect(repoEntity?.connectionConfig).toEqual(cmdProps.connectionConfig);
  };

  const checkEventIsCorrect = (event: ChannelRegisteredDomainEvent) => {
    expect(event).toBeInstanceOf(ChannelRegisteredDomainEvent);
    expect(event.aggregateId).not.toBeUndefined();
    expect(event.aggregateId).toBe(cmdResult.id);
    expect(event.channelName).toBe(cmdProps.name);
    expect(event.channelType.getValue()).toBe(cmdProps.channelType);
    expect(event.userId).toBe(cmdProps.userId);
  };
  return { cmdResult, checkRepoEntityIsCorrect, checkEventIsCorrect };
}

async function setupTestingModule({shouldDomainEventPublishFail}) {
  return await createTestingModule({
    commands: {
      commandHandler: RegisterChannelCommandHandler,
    },
    events: {
      shouldDomainEventPublishFail,
    },
    repositories: {name: 'ChannelRepository', repository: InMemoryChannelRepository}
  });
}

describe('RegisterChannelCommandHandler', () => {

  it('saves the data on the repository', async () => {
    const { commandHandler, repository } = await setupTestingModule({shouldDomainEventPublishFail: false})
    const { cmdResult, checkRepoEntityIsCorrect } = await executeCommand(commandHandler);

    const saved = await repository?.findById(cmdResult.id);
    checkRepoEntityIsCorrect(saved as Channel);
  });

  it('emits ChannelRegisteredDomainEvent', async () => {
    const { eventBus, commandHandler } = await setupTestingModule({shouldDomainEventPublishFail: false})
    const { checkEventIsCorrect } = await executeCommand(commandHandler);

    const lastEvent = (eventBus as any).events.pop()
    checkEventIsCorrect(lastEvent as ChannelRegisteredDomainEvent)
  });

  it('throws error if EventBus publish fails', async () => {
    const { eventBus, commandHandler } = await setupTestingModule({shouldDomainEventPublishFail: true})
    
    try {
      await executeCommand(commandHandler)
      fail("Should throw error")

    } catch (error) {
      expect(error.message).toBe("error test")
    }

    const lastEvent = (eventBus as any).events.pop()
    expect(lastEvent).toBeUndefined()
  });
});
