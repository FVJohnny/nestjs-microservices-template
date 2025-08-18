import { RegisterChannelCommandHandler } from './register-channel.command-handler';
import { RegisterChannelCommand } from './register-channel.command';
import type { RegisterChannelCommandProps } from './register-channel.command';
import type { ChannelRepository } from '../../domain/repositories/channel.repository';
import { Test } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { InMemoryChannelRepository } from '../../infrastructure/repositories/in-memory/in-memory-channel.repository';
import { ChannelRegisteredDomainEvent } from '../../domain/events/channel-registered.domain-event';
import { createTestDomainEventTestHandler } from '@libs/nestjs-common';
import { Channel } from '../../domain/entities/channel.entity';

const ChannelRegisteredDomainTestEventHandler = createTestDomainEventTestHandler(ChannelRegisteredDomainEvent);

async function createTestingModule() {
  ChannelRegisteredDomainTestEventHandler.reset();

  const moduleRef = await Test.createTestingModule({
    imports: [CqrsModule],
    providers: [
      RegisterChannelCommandHandler,
      ChannelRegisteredDomainTestEventHandler,
      { provide: 'ChannelRepository', useClass: InMemoryChannelRepository },
    ],
  }).compile();
  await moduleRef.init();

  const handler = moduleRef.get(RegisterChannelCommandHandler);
  const repo = moduleRef.get<ChannelRepository>('ChannelRepository');
  return { handler, repo, close: () => moduleRef.close() };
}

async function executeCommand(
  handler: RegisterChannelCommandHandler,
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

  const checkRepoEntityIsCorrect = async (repoEntity: Channel | null) => {
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

function getSingleCapturedEvent() {
  expect(ChannelRegisteredDomainTestEventHandler.events.length).toBe(1);
  return ChannelRegisteredDomainTestEventHandler
    .events[0] as unknown as ChannelRegisteredDomainEvent;
}

describe('RegisterChannelCommandHandler', () => {
  let handler: RegisterChannelCommandHandler;
  let repo: ChannelRepository;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ handler, repo, close } = await createTestingModule());
  });

  afterEach(async () => {
    await close();
  });

  it('persists, commits events, and emits ChannelRegisteredDomainEvent', async () => {
    const { cmdResult, checkRepoEntityIsCorrect, checkEventIsCorrect } = await executeCommand(handler);

    // Persisted state
    const saved = await repo.findById(cmdResult.id);
    await checkRepoEntityIsCorrect(saved);

    // Event delivered to handler
    const evt = getSingleCapturedEvent();
    checkEventIsCorrect(evt);
  });
});
