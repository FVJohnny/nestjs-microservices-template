import { Injectable, Logger } from '@nestjs/common';
import { Channel } from '../../domain/entities/channel.entity';
import { ChannelRepository } from '../../domain/repositories/channel.repository';

@Injectable()
export class InMemoryChannelRepository implements ChannelRepository {
  
  private readonly logger = new Logger(InMemoryChannelRepository.name);
  
  private channels: Map<string, Channel> = new Map();

  async save(channel: Channel): Promise<void> {
    this.logger.log(`[Repository - InMemoryChannelRepository] Saving channel: ${channel.id}`);
    this.channels.set(channel.id, channel);
  }

  async findById(id: string): Promise<Channel | null> {
    this.logger.log(`[Repository - InMemoryChannelRepository] Finding channel by id: ${id}`);
    return this.channels.get(id) || null;
  }

  async findByUserId(userId: string): Promise<Channel[]> {
    this.logger.log(`[Repository - InMemoryChannelRepository] Finding channels by user id: ${userId}`);
    return Array.from(this.channels.values()).filter(
      channel => channel.userId === userId
    );
  }

  async findAll(): Promise<Channel[]> {
    this.logger.log(`[Repository - InMemoryChannelRepository] Finding all channels`);
    return Array.from(this.channels.values());
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`[Repository - InMemoryChannelRepository] Deleting channel: ${id}`);
    this.channels.delete(id);
  }
}
