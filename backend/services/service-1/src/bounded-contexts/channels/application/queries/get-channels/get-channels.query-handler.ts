import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetChannelsQuery, GetChannelsQueryParams, GetChannelsQueryResponse } from './get-channels.query';
import type { ChannelRepository } from '../../../domain/repositories/channel.repository';
import { CorrelationLogger } from '@libs/nestjs-common';
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

@QueryHandler(GetChannelsQuery)
export class GetChannelsHandler implements IQueryHandler<GetChannelsQuery> {
  private readonly logger = new CorrelationLogger(GetChannelsHandler.name);

  constructor(
    @Inject('ChannelRepository')
    private readonly channelRepository: ChannelRepository,
  ) {}

  async execute(query: GetChannelsQuery): Promise<GetChannelsQueryResponse> {
    this.logger.log(
      `Handling GetChannelsQuery with params: ${JSON.stringify(query.params)}`,
    );

    const criteria = this.buildCriteriaFromRequest(query.params);
    const results = await this.channelRepository.findByCriteria(criteria);

    return {
      channels: results.map((channel) => ({
        id: channel.id,
        channelType: channel.channelType.getValue(),
        name: channel.name,
        userId: channel.userId,
        isActive: channel.isActive,
        createdAt: channel.createdAt.toISOString(),
      })),
    };
  }

  private buildCriteriaFromRequest(request: GetChannelsQueryParams): Criteria {
    const filters: Filter[] = [];

    if (request.userId) {
      filters.push(
        new Filter(
          new FilterField('userId'),
          FilterOperator.fromValue(Operator.EQUAL),
          new FilterValue(request.userId),
        ),
      );
    }

    if (request.channelType) {
      filters.push(
        new Filter(
          new FilterField('channelType'),
          FilterOperator.fromValue(Operator.EQUAL),
          new FilterValue(request.channelType),
        ),
      );
    }

    if (request.isActive !== undefined) {
      filters.push(
        new Filter(
          new FilterField('isActive'),
          FilterOperator.fromValue(Operator.EQUAL),
          new FilterValue(request.isActive.toString()),
        ),
      );
    }

    if (request.name) {
      filters.push(
        new Filter(
          new FilterField('name'),
          FilterOperator.fromValue(Operator.CONTAINS),
          new FilterValue(request.name),
        ),
      );
    }

    if (request.createdAfter) {
      filters.push(
        new Filter(
          new FilterField('createdAt'),
          FilterOperator.fromValue(Operator.GT),
          new FilterValue(new Date(request.createdAfter).toISOString()),
        ),
      );
    }

    if (request.createdBefore) {
      filters.push(
        new Filter(
          new FilterField('createdAt'),
          FilterOperator.fromValue(Operator.LT),
          new FilterValue(new Date(request.createdBefore).toISOString()),
        ),
      );
    }

    const filtersObj = new Filters(filters);
    const order = Order.fromValues(request.orderBy, request.orderType);

    return new Criteria(filtersObj, order);
  }
}
