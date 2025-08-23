import { GetChannelsHandler } from './get-channels.query-handler';
import { GetChannelsQuery } from './get-channels.query';
import type { ChannelRepository } from '../../../domain/repositories/channel.repository';
import { Channel } from '../../../domain/entities/channel.entity';
import { ChannelCriteria } from '../../../domain/criteria/channel-criteria';

describe('GetChannelsHandler', () => {
  const makeRepo = (): Partial<ChannelRepository> => ({
    findByCriteria: jest.fn(async () => []),
    countByCriteria: jest.fn(async () => 0),
  });

  it('delegates to findByCriteria with criteria', async () => {
    const repo = makeRepo();
    const handler = new GetChannelsHandler(repo as any);
    const criteria: ChannelCriteria = { userId: 'user-1' };
    const result = await handler.execute(new GetChannelsQuery(criteria));
    expect(result).toEqual([]);
    expect(repo.findByCriteria as jest.Mock).toHaveBeenCalledWith(criteria);
  });

  it('handles empty criteria', async () => {
    const repo = makeRepo();
    const handler = new GetChannelsHandler(repo as any);
    const criteria: ChannelCriteria = {};
    const result = await handler.execute(new GetChannelsQuery(criteria));
    expect(result).toEqual([]);
    expect(repo.findByCriteria as jest.Mock).toHaveBeenCalledWith(criteria);
  });
});
