import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetChannelsQuery } from './get-channels.query';
import { Channel } from '../../../domain/entities/channel.entity';
import type { ChannelRepository } from '../../../domain/repositories/channel.repository';
import { CorrelationLogger } from '@libs/nestjs-common';

@QueryHandler(GetChannelsQuery)
export class GetChannelsHandler implements IQueryHandler<GetChannelsQuery> {
  private readonly logger = new CorrelationLogger(GetChannelsHandler.name);

  constructor(
    @Inject('ChannelRepository')
    private readonly channelRepository: ChannelRepository,
  ) {}

  async execute(query: GetChannelsQuery): Promise<Channel[]> {
    this.logger.log(`Handling GetChannelsQuery with criteria: ${JSON.stringify(query.criteria)}`);
    
    return await this.channelRepository.findByCriteria(query.criteria);
  }
}
