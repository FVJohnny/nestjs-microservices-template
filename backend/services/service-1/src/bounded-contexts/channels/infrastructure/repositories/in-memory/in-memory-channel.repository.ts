import { Injectable } from '@nestjs/common';
import { Channel } from '../../../domain/entities/channel.entity';
import { ChannelRepository } from '../../../domain/repositories/channel.repository';
import { ChannelCriteria } from '../../../domain/criteria/channel-criteria';
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

  async countByUserId(userId: string): Promise<number> {
    try {
      this.logger.log(`Counting channels by user id: ${userId}`);
      return Array.from(this.channels.values()).filter(
        (channel) => channel.userId === userId,
      ).length;
    } catch (error) {
      this.handleDatabaseError('countByUserId', userId, error);
    }
  }

  async findByUserIdAndName(
    userId: string,
    name: string,
  ): Promise<Channel | null> {
    try {
      this.logger.log(
        `Finding channel by user id: ${userId} and name: ${name}`,
      );
      return (
        Array.from(this.channels.values()).find(
          (channel) => channel.userId === userId && channel.name === name,
        ) || null
      );
    } catch (error) {
      this.handleDatabaseError(
        'findByUserIdAndName',
        `${userId}:${name}`,
        error,
      );
    }
  }

  async findByCriteria(criteria: ChannelCriteria): Promise<Channel[]> {
    try {
      this.logger.log(`Finding channels with criteria: ${JSON.stringify(criteria)}`);
      let filtered = Array.from(this.channels.values());

      if (criteria.userId) {
        filtered = filtered.filter(channel => channel.userId === criteria.userId);
      }
      if (criteria.channelType) {
        filtered = filtered.filter(channel => channel.channelType.getValue() === criteria.channelType);
      }
      if (criteria.nameContains) {
        filtered = filtered.filter(channel => 
          channel.name.toLowerCase().includes(criteria.nameContains!.toLowerCase())
        );
      }

      return filtered;
    } catch (error) {
      this.handleDatabaseError('findByCriteria', JSON.stringify(criteria), error);
    }
  }

  async countByCriteria(criteria: ChannelCriteria): Promise<number> {
    try {
      const channels = await this.findByCriteria(criteria);
      return channels.length;
    } catch (error) {
      this.handleDatabaseError('countByCriteria', JSON.stringify(criteria), error);
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
