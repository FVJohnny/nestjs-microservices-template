import { Channel } from '../entities/channel.entity';

export interface ChannelRepository {
  save(channel: Channel): Promise<void>;
  findById(id: string): Promise<Channel | null>;
  findByUserId(userId: string): Promise<Channel[]>;
  findAll(): Promise<Channel[]>;
  delete(id: string): Promise<void>;
}
