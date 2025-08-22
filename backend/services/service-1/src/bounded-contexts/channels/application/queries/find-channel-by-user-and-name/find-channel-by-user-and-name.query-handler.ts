import { Injectable, Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindChannelByUserAndNameQuery } from './find-channel-by-user-and-name.query';
import type { ChannelRepository } from '../../../domain/repositories/channel.repository';
import { Channel } from '../../../domain/entities/channel.entity';
import { CorrelationLogger } from '@libs/nestjs-common';

@QueryHandler(FindChannelByUserAndNameQuery)
@Injectable()
export class FindChannelByUserAndNameHandler implements IQueryHandler<FindChannelByUserAndNameQuery> {
  private readonly logger = new CorrelationLogger(FindChannelByUserAndNameHandler.name);

  constructor(
    @Inject('ChannelRepository')
    private readonly channelRepository: ChannelRepository,
  ) {}

  async execute(query: FindChannelByUserAndNameQuery): Promise<Channel | null> {
    this.logger.log(`Finding channel by userId: ${query.userId} and name: ${query.name}`);
    return await this.channelRepository.findByUserIdAndName(query.userId, query.name);
  }
}