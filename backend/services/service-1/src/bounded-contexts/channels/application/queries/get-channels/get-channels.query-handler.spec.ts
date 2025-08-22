import { GetChannelsHandler } from './get-channels.query-handler';
import { GetChannelsQuery } from './get-channels.query';
import type { ChannelRepository } from '../../domain/repositories/channel.repository';
import { Channel } from '../../domain/entities/channel.entity';

describe('GetChannelsHandler', () => {
  const makeRepo = (): Partial<ChannelRepository> => ({
    findByUserId: jest.fn(async () => []),
    findAll: jest.fn(async () => []),
  });

  it('with userId delegates to findByUserId', async () => {
    const repo = makeRepo();
    const handler = new GetChannelsHandler(repo as any);
    const result = await handler.execute(new GetChannelsQuery('user-1'));
    expect(result).toEqual([]);
    expect(repo.findByUserId as jest.Mock).toHaveBeenCalledWith('user-1');
  });

  it('without userId delegates to findAll', async () => {
    const repo = makeRepo();
    const handler = new GetChannelsHandler(repo as any);
    const result = await handler.execute(new GetChannelsQuery(undefined));
    expect(result).toEqual([]);
    expect(repo.findAll as jest.Mock).toHaveBeenCalled();
  });
});
