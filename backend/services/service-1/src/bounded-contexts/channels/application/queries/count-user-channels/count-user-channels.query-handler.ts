import { Injectable, Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CountUserChannelsQuery } from './count-user-channels.query';
import type { ChannelRepository } from '../../../domain/repositories/channel.repository';
import { CorrelationLogger } from '@libs/nestjs-common';

@QueryHandler(CountUserChannelsQuery)
@Injectable()
export class CountUserChannelsHandler implements IQueryHandler<CountUserChannelsQuery> {
  private readonly logger = new CorrelationLogger(CountUserChannelsHandler.name);

  constructor(
    @Inject('ChannelRepository')
    private readonly channelRepository: ChannelRepository,
  ) {}

  async execute(query: CountUserChannelsQuery): Promise<number> {
    this.logger.log(`Counting channels for user: ${query.userId}`);
    return await this.channelRepository.countByUserId(query.userId);
  }
}