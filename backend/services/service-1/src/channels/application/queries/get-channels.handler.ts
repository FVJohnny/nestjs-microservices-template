import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetChannelsQuery } from './get-channels.query';
import { Channel } from '../../domain/entities/channel.entity';
import type { ChannelRepository } from '../../domain/repositories/channel.repository';
import { Logger } from '@nestjs/common';

@QueryHandler(GetChannelsQuery)
export class GetChannelsHandler implements IQueryHandler<GetChannelsQuery> {
  
  private readonly logger = new Logger(GetChannelsHandler.name);  
  
  constructor(
    @Inject('ChannelRepository')
    private readonly channelRepository: ChannelRepository,
  ) {}

  async execute(query: GetChannelsQuery): Promise<Channel[]> {
    this.logger.log('[Query Handler - GetChannelsQuery] Handling GetChannelsQuery...');
    const { userId } = query;

    if (userId) {
      return await this.channelRepository.findByUserId(userId);
    }

    return await this.channelRepository.findAll();
  }
}
