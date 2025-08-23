import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { CorrelationLogger, UseCase } from '@libs/nestjs-common';
import { GetChannelsQuery } from '../../queries/get-channels/get-channels.query';
import { ChannelCriteriaBuilder } from '../../../domain/criteria/channel-criteria';
import {
  GetChannelsRequest,
  GetChannelsResponse,
  ChannelSummary,
} from './get-channels.request-response';
import { Channel } from '../../../domain/entities/channel.entity';

export interface GetChannelsUseCase 
  extends UseCase<GetChannelsRequest, GetChannelsResponse> {}

// Add static token property to the interface namespace
export namespace GetChannelsUseCase {
  export const token = Symbol('GetChannelsUseCase');
}

@Injectable()
export class GetChannelsUseCaseImpl implements GetChannelsUseCase {
  private readonly logger = new CorrelationLogger(
    GetChannelsUseCaseImpl.name,
  );

  constructor(
    private readonly queryBus: QueryBus,
  ) {}

  async execute(request: GetChannelsRequest): Promise<GetChannelsResponse> {
    this.logger.log(
      `Executing GetChannels use case with filters: ${JSON.stringify(request)}`,
    );

    // Build criteria from request
    const criteria = this.buildCriteriaFromRequest(request);

    // Get channels using repository-level filtering
    const channels = await this.getChannels(criteria);

    // Transform to response format
    const channelSummaries = channels.map((channel) =>
      this.mapToChannelSummary(channel),
    );

    this.logger.log(
      `Retrieved ${channelSummaries.length} channels with filters applied`,
    );

    return {
      channels: channelSummaries,
      totalCount: channelSummaries.length,
      appliedFilters: request,
    };
  }


  private buildCriteriaFromRequest(request: GetChannelsRequest) {
    const builder = ChannelCriteriaBuilder.create();

    if (request.userId) {
      builder.userId(request.userId);
    }

    if (request.channelType) {
      builder.channelType(request.channelType);
    }

    if (request.isActive !== undefined) {
      builder.isActive(request.isActive);
    }

    if (request.name) {
      builder.nameContains(request.name); // Use partial matching for name
    }

    if (request.createdAfter) {
      builder.createdAfter(request.createdAfter);
    }

    if (request.createdBefore) {
      builder.createdBefore(request.createdBefore);
    }

    // Add default sorting
    builder.sortBy('createdAt', 'desc');

    return builder.build();
  }

  private async getChannels(criteria: any): Promise<Channel[]> {
    return await this.queryBus.execute(
      new GetChannelsQuery(criteria)
    );
  }

  private mapToChannelSummary(channel: Channel): ChannelSummary {
    return {
      id: channel.id,
      name: channel.name,
      channelType: channel.channelType.getValue(),
      userId: channel.userId,
      isActive: true, // Assuming active channels only from repository
      createdAt: channel.createdAt,
      // Note: connectionConfig is intentionally excluded for security
    };
  }
}
