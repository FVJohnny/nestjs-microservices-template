import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { CorrelationLogger, UseCase, UseCaseHandler } from '@libs/nestjs-common';
import { UserExistsQuery } from '../../queries/user-exists/user-exists.query';
import { GetChannelsQuery } from '../../queries/get-channels/get-channels.query';
import { ChannelCriteriaBuilder } from '../../../domain/criteria/channel-criteria';
import {
  GetChannelsRequest,
  GetChannelsResponse,
  ChannelSummary,
} from './get-channels.request-response';
import { UserNotFoundError } from '../register-channel/register-channel.request-response';
import { Channel } from '../../../domain/entities/channel.entity';

export interface GetChannelsUseCase 
  extends UseCase<GetChannelsRequest, GetChannelsResponse> {}

@Injectable()
@UseCaseHandler({
  name: 'GetChannels',
  description: 'Retrieves channels with configurable filtering options',
  category: 'channels',
  trackPerformance: true,
})
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

    // If userId is provided, validate the user exists
    if (request.userId) {
      await this.validateUserExists(request.userId);
    }

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

  private async validateUserExists(userId: string): Promise<void> {
    const userExists = await this.queryBus.execute(
      new UserExistsQuery(userId)
    );
    if (!userExists) {
      this.logger.warn(`Query failed: User ${userId} does not exist`);
      throw new UserNotFoundError(userId);
    }
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
