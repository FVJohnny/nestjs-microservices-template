import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '../../../domain/entities/channel.entity';
import { ChannelRepository } from '../../../domain/repositories/channel.repository';
import { PostgreSQLChannelEntity } from './channel.schema';
import { ChannelTypeVO } from '../../../domain/value-objects/channel-type.vo';
import { CorrelationLogger } from '@libs/nestjs-common';

@Injectable()
export class PostgreSQLChannelRepository implements ChannelRepository {
  private readonly logger = new CorrelationLogger(
    PostgreSQLChannelRepository.name,
  );

  constructor(
    @InjectRepository(PostgreSQLChannelEntity)
    private readonly channelRepository: Repository<PostgreSQLChannelEntity>,
  ) {}

  async save(channel: Channel): Promise<Channel> {
    try {
      this.logger.log(`Saving channel: ${channel.id}`);
      
      const entity = this.mapToEntity(channel);
      await this.channelRepository.save(entity);
      
      this.logger.log(`Successfully saved channel: ${channel.id}`);
      return channel;
    } catch (error) {
      this.logger.error(`Failed to save channel ${channel.id}`, error);
      throw new Error(
        `Failed to save channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findById(id: string): Promise<Channel | null> {
    try {
      this.logger.log(`Finding channel by id: ${id}`);
      
      const entity = await this.channelRepository.findOne({
        where: { id, isActive: true },
      });
      
      return entity ? this.mapToDomain(entity) : null;
    } catch (error) {
      this.logger.error(`Failed to find channel by id ${id}`, error);
      throw new Error(
        `Failed to find channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findByUserId(userId: string): Promise<Channel[]> {
    try {
      this.logger.log(`Finding channels for userId: ${userId}`);
      
      const entities = await this.channelRepository.find({
        where: { userId, isActive: true },
        order: { createdAt: 'DESC' },
      });
      
      return entities.map(entity => this.mapToDomain(entity));
    } catch (error) {
      this.logger.error(`Failed to find channels by user id ${userId}`, error);
      throw new Error(
        `Failed to find channels by user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findAll(criteria?: Record<string, any>): Promise<Channel[]> {
    try {
      this.logger.log('Finding all channels');
      
      const queryBuilder = this.channelRepository.createQueryBuilder('channel');
      queryBuilder.where('channel.isActive = :isActive', { isActive: true });
      
      // Apply additional criteria if provided
      if (criteria) {
        if (criteria.channelType) {
          queryBuilder.andWhere('channel.channelType = :channelType', {
            channelType: criteria.channelType,
          });
        }
        if (criteria.userId) {
          queryBuilder.andWhere('channel.userId = :userId', {
            userId: criteria.userId,
          });
        }
        if (criteria.name) {
          queryBuilder.andWhere('channel.name ILIKE :name', {
            name: `%${criteria.name}%`,
          });
        }
      }
      
      queryBuilder.orderBy('channel.createdAt', 'DESC');
      
      const entities = await queryBuilder.getMany();
      return entities.map(entity => this.mapToDomain(entity));
    } catch (error) {
      this.logger.error(`Failed to find all channels`, error);
      throw new Error(
        `Failed to find all channels: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Removing channel with id: ${id}`);
      
      // Soft delete by setting isActive to false
      await this.channelRepository.update(
        { id },
        { isActive: false, updatedAt: new Date() },
      );
      
      this.logger.log(`Soft deleted channel: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to remove channel ${id}`, error);
      throw new Error(
        `Failed to remove channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      this.logger.log(`Checking if channel exists with id: ${id}`);
      
      const count = await this.channelRepository.count({
        where: { id, isActive: true },
      });
      
      return count > 0;
    } catch (error) {
      this.logger.error(`Failed to check if channel exists ${id}`, error);
      throw new Error(
        `Failed to check channel existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async count(criteria?: Record<string, any>): Promise<number> {
    try {
      this.logger.log('Counting channels');
      
      const where: any = { isActive: true };
      
      if (criteria) {
        if (criteria.channelType) {
          where.channelType = criteria.channelType;
        }
        if (criteria.userId) {
          where.userId = criteria.userId;
        }
      }
      
      return await this.channelRepository.count({ where });
    } catch (error) {
      this.logger.error(`Failed to count channels`, error);
      throw new Error(
        `Failed to count channels: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Map domain entity to PostgreSQL entity
   */
  private mapToEntity(channel: Channel): PostgreSQLChannelEntity {
    const entity = new PostgreSQLChannelEntity();
    entity.id = channel.id;
    entity.channelType = channel.channelType.getValue();
    entity.name = channel.name;
    entity.userId = channel.userId;
    entity.connectionConfig = channel.connectionConfig;
    entity.isActive = channel.isActive;
    entity.createdAt = channel.createdAt;
    entity.updatedAt = new Date();
    
    return entity;
  }

  /**
   * Map PostgreSQL entity to domain entity
   */
  private mapToDomain(entity: PostgreSQLChannelEntity): Channel {
    return new Channel(
      entity.id,
      ChannelTypeVO.create(entity.channelType),
      entity.name,
      entity.userId,
      entity.connectionConfig || {},
      entity.isActive,
      entity.createdAt,
    );
  }
}