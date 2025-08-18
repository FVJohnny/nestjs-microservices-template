import { RegisterChannelCommandHandler } from './register-channel.command-handler';
import { RegisterChannelCommand } from './register-channel.command';
import type { ChannelRepository } from '../../domain/repositories/channel.repository';

describe('RegisterChannelCommandHandler', () => {
  const makeRepo = (): Partial<ChannelRepository> => ({
    save: jest.fn(async (ch) => ch),
  });
  const makeEventBus = () => ({ publish: jest.fn() });

  it('saves aggregate and publishes domain events', async () => {
    const repo = makeRepo();
    const eventBus = makeEventBus();
    const handler = new RegisterChannelCommandHandler(repo as any, eventBus as any);

    const cmd = new RegisterChannelCommand({
      channelType: 'telegram',
      name: 'My Channel',
      userId: 'user-1',
      connectionConfig: { token: 'abc' },
    });

    const id = await handler.execute(cmd);

    expect(typeof id).toBe('string');
    expect((repo.save as jest.Mock)).toHaveBeenCalledTimes(1);
    expect((eventBus.publish as jest.Mock)).toHaveBeenCalled();
  });
});
