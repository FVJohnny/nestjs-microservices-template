import { Injectable } from '@nestjs/common';
import { Channel } from '../../../domain/entities/channel.entity';
import { ChannelRepository } from '../../../domain/repositories/channel.repository';
import { ChannelTypeVO } from '../../../domain/value-objects/channel-type.vo';
import { RedisService } from '@libs/nestjs-redis';
import { CorrelationLogger } from '@libs/nestjs-common';

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

  private readonly logger = new CorrelationLogger(
    RedisChannelRepository.name,
  );

  constructor(private readonly redisService: RedisService) {}

  async findById(id: string): Promise<Channel | null> {
    this.logger.log(`Finding channel by id: ${id}`);
    const data = await this.redisService.get(`${this.keyPrefix}${id}`);
    if (!data) {
      return null;
    }

    const channelData = JSON.parse(data) as ChannelData;
    return this.mapToEntity(channelData);
  }

  async findAll(criteria?: Record<string, any>): Promise<Channel[]> {
    this.logger.log(`Finding all channels`);
    const keys = await this.redisService.keys(`${this.keyPrefix}*`);
    
    if (keys.length === 0) {
      return [];
    }

    const values = await this.redisService.mget(...keys);
    
    return values
      .filter((data) => data !== null)
      .map(data => this.safeParseChannel(data))
      .filter((channel) => channel !== null)
      .filter(channel => this.matchesCriteria(channel, criteria));
  }

  private safeParseChannel(data: string): Channel | null {
    try {
      const channelData = JSON.parse(data) as ChannelData;
      return this.mapToEntity(channelData);
    } catch {
      return null; // Skip invalid JSON data
    }
  }

  async findByUserId(userId: string): Promise<Channel[]> {
    this.logger.log(`Finding channels by user id: ${userId}`);
    const channelIds = await this.redisService.smembers(
      `${this.userIndexPrefix}${userId}`,
    );

    if (channelIds.length === 0) {
      return [];
    }

    const keys = channelIds.map(id => `${this.keyPrefix}${id}`);
    const values = await this.redisService.mget(...keys);

    return values
      .filter((data) => data !== null)
      .map(data => this.safeParseChannel(data))
      .filter((channel) => channel !== null);
  }

  async save(entity: Channel): Promise<Channel> {
    this.logger.log(`Saving channel: ${entity.id}`);
    const channelData = this.mapToData(entity);
    const key = `${this.keyPrefix}${entity.id}`;

    await this.redisService.set(key, JSON.stringify(channelData));
    await this.redisService.sadd(
      `${this.userIndexPrefix}${entity.userId}`,
      entity.id,
    );

    return entity;
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting channel: ${id}`);
    const channel = await this.findById(id);
    if (channel) {
      await this.redisService.del(`${this.keyPrefix}${id}`);
      await this.redisService.srem(
        `${this.userIndexPrefix}${channel.userId}`,
        id,
      );
    }
  }

  async exists(id: string): Promise<boolean> {
    this.logger.log(`Checking if channel exists with id: ${id}`);
    const exists = await this.redisService.exists(`${this.keyPrefix}${id}`);
    return exists === 1;
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
