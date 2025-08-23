import { GetChannelsHandler } from './get-channels.query-handler';
import { GetChannelsQuery } from './get-channels.query';
import type { ChannelRepository } from '../../../domain/repositories/channel.repository';
import { Channel } from '../../../domain/entities/channel.entity';
import {
  Criteria,
  Filters,
  Filter,
  FilterField,
  FilterOperator,
  FilterValue,
  Order,
  Operator,
} from '@libs/nestjs-common';

describe('GetChannelsHandler', () => {
  const makeRepo = (): Partial<ChannelRepository> => ({
    findByCriteria: jest.fn(async () => []),
    countByCriteria: jest.fn(async () => 0),
  });

  it('delegates to findByCriteria with criteria', async () => {
    const repo = makeRepo();
    const handler = new GetChannelsHandler(repo as any);
    const filters = new Filters([
      new Filter(
        new FilterField('userId'),
        FilterOperator.fromValue(Operator.EQUAL),
        new FilterValue('user-1'),
      ),
    ]);
    const criteria = new Criteria(filters, Order.none());
    const result = await handler.execute(new GetChannelsQuery(criteria));
    expect(result).toEqual([]);
    expect(repo.findByCriteria as jest.Mock).toHaveBeenCalledWith(criteria);
  });

  it('handles empty criteria', async () => {
    const repo = makeRepo();
    const handler = new GetChannelsHandler(repo as any);
    const criteria = new Criteria(Filters.none(), Order.none());
    const result = await handler.execute(new GetChannelsQuery(criteria));
    expect(result).toEqual([]);
    expect(repo.findByCriteria as jest.Mock).toHaveBeenCalledWith(criteria);
  });
});
