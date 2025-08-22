import { Injectable } from '@nestjs/common';
import { Channel } from '../../../domain/entities/channel.entity';
import { ChannelRepository } from '../../../domain/repositories/channel.repository';
import { ChannelTypeVO } from '../../../domain/value-objects/channel-type.vo';
import { ChannelCriteria } from '../../../domain/criteria/channel-criteria';
import { RedisService } from '@libs/nestjs-redis';
import { CorrelationLogger } from '@libs/nestjs-common';
import { ChannelPersistenceException } from '../../errors';

interface ChannelData {
  id: string;
  channelType: string;
  name: string;
  userId: string;
  connectionConfig: Record<string, any>;
  isActive: boolean;
  createdAt: string;
}

@Injectable()
export class RedisChannelRepository implements ChannelRepository {
  private readonly keyPrefix = 'channel:';
  private readonly userIndexPrefix = 'user_channels:';

  private readonly logger = new CorrelationLogger(RedisChannelRepository.name);

  constructor(private readonly redisService: RedisService) {}

  async findById(id: string): Promise<Channel | null> {
    try {
      this.logger.log(`Finding channel by id: ${id}`);
      const data = await this.redisService.get(`${this.keyPrefix}${id}`);
      if (!data) {
        return null;
      }

      const channelData = JSON.parse(data) as ChannelData;
      return this.mapToEntity(channelData);
    } catch (error) {
      this.handleDatabaseError('find', id, error);
    }
  }

  async findAll(criteria?: Record<string, any>): Promise<Channel[]> {
    try {
      this.logger.log(`Finding all channels`);
      const keyPattern = `${this.keyPrefix}*`;
      const keys = await this.redisService.scan(keyPattern);

      if (keys.length === 0) {
        return [];
      }

      const values = await this.redisService.mget(...keys);

      return values
        .filter((data) => data !== null)
        .map((data) => this.safeParseChannel(data))
        .filter((channel) => channel !== null)
        .filter((channel) => this.matchesCriteria(channel, criteria));
    } catch (error) {
      this.handleDatabaseError('findAll', 'all', error);
    }
  }

  private safeParseChannel(data: string): Channel | null {
    try {
      const channelData = JSON.parse(data) as ChannelData;
      return this.mapToEntity(channelData);
    } catch (error) {
      this.logger.error(`Failed to parse channel data: ${data}`, error);
      return null; // Skip invalid JSON data
    }
  }

  async findByUserId(userId: string): Promise<Channel[]> {
    try {
      this.logger.log(`Finding channels by user id: ${userId}`);
      const channelIds = await this.redisService.smembers(
        `${this.userIndexPrefix}${userId}`,
      );

      if (channelIds.length === 0) {
        return [];
      }

      const keys = channelIds.map((id) => `${this.keyPrefix}${id}`);
      const values = await this.redisService.mget(...keys);

      return values
        .filter((data) => data !== null)
        .map((data) => this.safeParseChannel(data))
        .filter((channel) => channel !== null);
    } catch (error) {
      this.handleDatabaseError('findByUserId', userId, error);
    }
  }

  async save(entity: Channel): Promise<Channel> {
    try {
      this.logger.log(`Saving channel: ${entity.id}`);
      const channelData = this.mapToData(entity);
      const key = `${this.keyPrefix}${entity.id}`;

      await this.redisService.set(key, JSON.stringify(channelData));
      await this.redisService.sadd(
        `${this.userIndexPrefix}${entity.userId}`,
        entity.id,
      );

      return entity;
    } catch (error) {
      this.handleDatabaseError('save', entity.id, error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Deleting channel: ${id}`);
      const channel = await this.findById(id);
      if (channel) {
        await this.redisService.del(`${this.keyPrefix}${id}`);
        await this.redisService.srem(
          `${this.userIndexPrefix}${channel.userId}`,
          id,
        );
      }
    } catch (error) {
      this.handleDatabaseError('remove', id, error);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      this.logger.log(`Checking if channel exists with id: ${id}`);
      const exists = await this.redisService.exists(`${this.keyPrefix}${id}`);
      return exists === 1;
    } catch (error) {
      this.handleDatabaseError('exists', id, error);
    }
  }

  async countByUserId(userId: string): Promise<number> {
    try {
      this.logger.log(`Counting channels for userId: ${userId}`);
      const channelIds = await this.redisService.smembers(
        `${this.userIndexPrefix}${userId}`,
      );
      return channelIds.length;
    } catch (error) {
      this.handleDatabaseError('countByUserId', userId, error);
    }
  }

  async findByUserIdAndName(
    userId: string,
    name: string,
  ): Promise<Channel | null> {
    try {
      this.logger.log(`Finding channel by userId: ${userId} and name: ${name}`);
      const channels = await this.findByUserId(userId);
      return channels.find((channel) => channel.name === name) || null;
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
      
      // For Redis, we'll get all channels and filter in-memory for simplicity
      // In a production system, you might use Redis modules for more complex querying
      const allChannels = await this.findAll();
      let filtered = allChannels;

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

  private mapToEntity(data: ChannelData): Channel {
    return new Channel(
      data.id,
      ChannelTypeVO.create(data.channelType),
      data.name,
      data.userId,
      data.connectionConfig,
      data.isActive,
      new Date(data.createdAt),
    );
  }

  private mapToData(entity: Channel): ChannelData {
    return {
      id: entity.id,
      channelType: entity.channelType.getValue(),
      name: entity.name,
      userId: entity.userId,
      connectionConfig: entity.connectionConfig,
      isActive: entity.isActive,
      createdAt: entity.createdAt.toISOString(),
    };
  }

  private matchesCriteria(
    channel: Channel,
    criteria?: Record<string, any>,
  ): boolean {
    if (!criteria) {
      return true;
    }

    for (const [key, value] of Object.entries(criteria)) {
      if (key === 'channelType' && channel.channelType.getValue() !== value) {
        return false;
      }
      if (key === 'userId' && channel.userId !== value) {
        return false;
      }
      if (key === 'isActive' && channel.isActive !== value) {
        return false;
      }
      if (key === 'name' && channel.name !== value) {
        return false;
      }
    }

    return true;
  }
}
