import { Injectable } from '@nestjs/common';
import { Channel } from '../../domain/entities/channel.entity';
import { ChannelRepository } from '../../domain/repositories/channel.repository';

@Injectable()
export class InMemoryChannelRepository implements ChannelRepository {
  private channels: Map<string, Channel> = new Map();

  async save(channel: Channel): Promise<void> {
    this.channels.set(channel.id, channel);
  }

  async findById(id: string): Promise<Channel | null> {
    return this.channels.get(id) || null;
  }

  async findByUserId(userId: string): Promise<Channel[]> {
    return Array.from(this.channels.values()).filter(
      channel => channel.userId === userId
    );
  }

  async findAll(): Promise<Channel[]> {
    return Array.from(this.channels.values());
  }

  async delete(id: string): Promise<void> {
    this.channels.delete(id);
  }
}
