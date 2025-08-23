import { Channel } from '../entities/channel.entity';
import { Repository, Criteria } from '@libs/nestjs-common';

export interface ChannelRepository extends Repository<Channel> {
  findByCriteria(criteria: Criteria): Promise<Channel[]>;
  countByCriteria(criteria: Criteria): Promise<number>;
}
