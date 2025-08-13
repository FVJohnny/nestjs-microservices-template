import { Injectable, Logger } from '@nestjs/common';
import { Channel } from '../../domain/entities/channel.entity';
import { ChannelRepository } from '../../domain/repositories/channel.repository';
import { CorrelationLogger } from '@libs/nestjs-common';

@Injectable()
export class InMemoryChannelRepository implements ChannelRepository {
  
  private readonly logger = new CorrelationLogger(InMemoryChannelRepository.name);
  
  private channels: Map<string, Channel> = new Map();

  async save(channel: Channel): Promise<Channel> {
    this.logger.log(`Saving channel: ${channel.id}`);
    this.channels.set(channel.id, channel);
    return channel;
  }

  async findById(id: string): Promise<Channel | null> {
    this.logger.log(`Finding channel by id: ${id}`);
    return this.channels.get(id) || null;
  }

  async findByUserId(userId: string): Promise<Channel[]> {
    this.logger.log(`Finding channels by user id: ${userId}`);
    return Array.from(this.channels.values()).filter(
      channel => channel.userId === userId
    );
  }

  async findAll(): Promise<Channel[]> {
    this.logger.log(`Finding all channels`);
    return Array.from(this.channels.values());
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting channel: ${id}`);
    this.channels.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.channels.has(id);
  }
}
