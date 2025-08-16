import { Injectable } from '@nestjs/common';
import { Channel } from '../../../domain/entities/channel.entity';
import { ChannelRepository } from '../../../domain/repositories/channel.repository';
import { CorrelationLogger } from '@libs/nestjs-common';
import { ChannelPersistenceException } from '../../errors';

@Injectable()
export class InMemoryChannelRepository implements ChannelRepository {
  private readonly logger = new CorrelationLogger(
    InMemoryChannelRepository.name,
  );

  private channels: Map<string, Channel> = new Map();

  async save(channel: Channel): Promise<Channel> {
    try {
      this.logger.log(`Saving channel: ${channel.id}`);
      this.channels.set(channel.id, channel);
      return channel;
    } catch (error) {
      this.handleDatabaseError('save', channel.id, error);
    }
  }

  async findById(id: string): Promise<Channel | null> {
    try {
      this.logger.log(`Finding channel by id: ${id}`);
      return this.channels.get(id) || null;
    } catch (error) {
      this.handleDatabaseError('find', id, error);
    }
  }

  async findByUserId(userId: string): Promise<Channel[]> {
    try {
      this.logger.log(`Finding channels by user id: ${userId}`);
      return Array.from(this.channels.values()).filter(
        (channel) => channel.userId === userId,
      );
    } catch (error) {
      this.handleDatabaseError('findByUserId', userId, error);
    }
  }

  async findAll(): Promise<Channel[]> {
    try {
      this.logger.log(`Finding all channels`);
      return Array.from(this.channels.values());
    } catch (error) {
      this.handleDatabaseError('findAll', 'all', error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Deleting channel: ${id}`);
      this.channels.delete(id);
    } catch (error) {
      this.handleDatabaseError('remove', id, error);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      return this.channels.has(id);
    } catch (error) {
      this.handleDatabaseError('exists', id, error);
    }
  }

  /**
   * Handle database errors consistently
   */
  private handleDatabaseError(
    operation: string,
    id: string,
    error: unknown,
  ): never {
    const cause =
      error instanceof Error ? error : new Error('Unknown database error');
    throw new ChannelPersistenceException(operation, id, cause);
  }
}
