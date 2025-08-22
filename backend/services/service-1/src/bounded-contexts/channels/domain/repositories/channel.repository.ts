import { Channel } from '../entities/channel.entity';
import { Repository } from '@libs/nestjs-common';
import { ChannelCriteria } from '../criteria/channel-criteria';

export interface ChannelRepository extends Repository<Channel> {
  findByUserId(userId: string): Promise<Channel[]>;
  findByCriteria(criteria: ChannelCriteria): Promise<Channel[]>;
  countByUserId(userId: string): Promise<number>;
  countByCriteria(criteria: ChannelCriteria): Promise<number>;
  findByUserIdAndName(userId: string, name: string): Promise<Channel | null>;
}
