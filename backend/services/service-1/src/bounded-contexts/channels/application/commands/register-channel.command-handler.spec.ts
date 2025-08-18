import { RegisterChannelCommandHandler } from './register-channel.command-handler';
import { RegisterChannelCommand } from './register-channel.command';
import type { RegisterChannelCommandProps } from './register-channel.command';
import { InMemoryChannelRepository } from '../../infrastructure/repositories/in-memory/in-memory-channel.repository';
import { ChannelRegisteredDomainEvent } from '../../domain/events/channel-registered.domain-event';
import { Channel } from '../../domain/entities/channel.entity';
import { ICommandHandler } from '@nestjs/cqrs';
import { createTestingModule } from './testing-helper';
import { fail } from 'assert';



async function executeCommand(
  handler: ICommandHandler,
  overrides: Partial<RegisterChannelCommandProps> = {},
) {
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

async function setupTestingModule({shouldEventPublishFail}) {
  return await createTestingModule({
    commands: {
      commandHandler: RegisterChannelCommandHandler,
    },
    events: {
      shouldEventPublishFail,
    },
    repositories: {name: 'ChannelRepository', repository: InMemoryChannelRepository}
  });
}

describe('RegisterChannelCommandHandler', () => {

  beforeEach(async () => {
    
  });

  afterEach(async () => {
  });

  it('saves the data on the repository', async () => {
    const { commandHandler, repository } = await setupTestingModule({shouldEventPublishFail: false})
    const { cmdResult, checkRepoEntityIsCorrect } = await executeCommand(commandHandler);

    // Persisted state
    const saved = await repository.findById(cmdResult.id);
    checkRepoEntityIsCorrect(saved as Channel);
  });

  it('emits ChannelRegisteredDomainEvent', async () => {
    const { eventBus, commandHandler } = await setupTestingModule({shouldEventPublishFail: false})
    const { checkEventIsCorrect } = await executeCommand(commandHandler);

    // TODO:  Mock Event Bus
    // const lastEvent = eventBus.something
    // checkEventIsCorrect(lastEvent)
  });

  it('throws error if EventBus publish fails', async () => {
    const { commandHandler } = await setupTestingModule({shouldEventPublishFail: true})
    
    try {
      await executeCommand(commandHandler)
      fail("Should throw error")

    } catch (error) {
      expect(error.message).toBe("error test")
    }

    // TODO:  Mock Event Bus
    // const lastEvent = eventBus.something
    // Check that there is no event
  });
});
