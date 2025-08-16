import { Channel } from '../entities/channel.entity';
import { Repository } from '@libs/nestjs-common';

export interface ChannelRepository extends Repository<Channel> {
  findByUserId(userId: string): Promise<Channel[]>;
}
