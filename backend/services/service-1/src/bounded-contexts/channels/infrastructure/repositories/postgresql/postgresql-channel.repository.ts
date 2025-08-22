import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Channel } from '../../../domain/entities/channel.entity';
import { ChannelRepository } from '../../../domain/repositories/channel.repository';
import { PostgreSQLChannelEntity } from './channel.schema';
import { ChannelTypeVO } from '../../../domain/value-objects/channel-type.vo';
import { ChannelCriteria } from '../../../domain/criteria/channel-criteria';
import { CorrelationLogger } from '@libs/nestjs-common';
import { ChannelPersistenceException } from '../../errors';

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
      this.handleDatabaseError('save', channel.id, error);
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
      this.handleDatabaseError('find', id, error);
    }
  }

  async findByUserId(userId: string): Promise<Channel[]> {
    try {
      this.logger.log(`Finding channels for userId: ${userId}`);

      const entities = await this.channelRepository.find({
        where: { userId, isActive: true },
        order: { createdAt: 'DESC' },
      });

      return entities.map((entity) => this.mapToDomain(entity));
    } catch (error) {
      this.handleDatabaseError('findByUserId', userId, error);
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
      return entities.map((entity) => this.mapToDomain(entity));
    } catch (error) {
      this.handleDatabaseError('findAll', 'all', error);
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
      this.handleDatabaseError('remove', id, error);
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
      this.handleDatabaseError('exists', id, error);
    }
  }

  async findByCriteria(criteria: ChannelCriteria): Promise<Channel[]> {
    try {
      this.logger.log(`Finding channels with criteria: ${JSON.stringify(criteria)}`);

      const queryBuilder = this.buildCriteriaQuery(criteria);
      const entities = await queryBuilder.getMany();

      return entities.map(entity => this.mapToDomain(entity));
    } catch (error) {
      this.handleDatabaseError('findByCriteria', JSON.stringify(criteria), error);
    }
  }

  async countByCriteria(criteria: ChannelCriteria): Promise<number> {
    try {
      this.logger.log(`Counting channels with criteria: ${JSON.stringify(criteria)}`);

      const queryBuilder = this.buildCriteriaQuery(criteria);
      return await queryBuilder.getCount();
    } catch (error) {
      this.handleDatabaseError('countByCriteria', JSON.stringify(criteria), error);
    }
  }

  private buildCriteriaQuery(criteria: ChannelCriteria): SelectQueryBuilder<PostgreSQLChannelEntity> {
    let queryBuilder = this.channelRepository
      .createQueryBuilder('channel')
      .where('channel.isActive = :isActive', { isActive: true });

    if (criteria.userId) {
      queryBuilder = queryBuilder.andWhere('channel.userId = :userId', { userId: criteria.userId });
    }

    if (criteria.channelType) {
      queryBuilder = queryBuilder.andWhere('channel.channelType = :channelType', { channelType: criteria.channelType });
    }

    if (criteria.isActive !== undefined) {
      queryBuilder = queryBuilder.andWhere('channel.isActive = :isActive', { isActive: criteria.isActive });
    }

    if (criteria.name) {
      queryBuilder = queryBuilder.andWhere('channel.name = :name', { name: criteria.name });
    }

    if (criteria.nameContains) {
      queryBuilder = queryBuilder.andWhere('LOWER(channel.name) LIKE LOWER(:nameContains)', { 
        nameContains: `%${criteria.nameContains}%` 
      });
    }

    if (criteria.createdAfter) {
      queryBuilder = queryBuilder.andWhere('channel.createdAt >= :createdAfter', { createdAfter: criteria.createdAfter });
    }

    if (criteria.createdBefore) {
      queryBuilder = queryBuilder.andWhere('channel.createdAt <= :createdBefore', { createdBefore: criteria.createdBefore });
    }

    // Apply sorting
    const sortField = criteria.sortBy || 'createdAt';
    const sortOrder = criteria.sortOrder || 'DESC';
    queryBuilder = queryBuilder.orderBy(`channel.${sortField}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Apply pagination
    if (criteria.limit) {
      queryBuilder = queryBuilder.limit(criteria.limit);
    }

    if (criteria.offset) {
      queryBuilder = queryBuilder.offset(criteria.offset);
    }

    return queryBuilder;
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

  async countByUserId(userId: string): Promise<number> {
    try {
      this.logger.log(`Counting channels for user: ${userId}`);

      const count = await this.channelRepository.count({
        where: { userId, isActive: true },
      });

      this.logger.log(`Found ${count} channels for user: ${userId}`);
      return count;
    } catch (error) {
      this.handleDatabaseError('countByUserId', userId, error);
    }
  }

  async findByUserIdAndName(
    userId: string,
    name: string,
  ): Promise<Channel | null> {
    try {
      this.logger.log(`Finding channel for user ${userId} with name: ${name}`);

      const entity = await this.channelRepository.findOne({
        where: { userId, name, isActive: true },
      });

      if (!entity) {
        this.logger.log(
          `No channel found for user ${userId} with name: ${name}`,
        );
        return null;
      }

      const channel = this.mapToDomain(entity);
      this.logger.log(
        `Found channel ${channel.id} for user ${userId} with name: ${name}`,
      );
      return channel;
    } catch (error) {
      this.handleDatabaseError(
        'findByUserIdAndName',
        `${userId}:${name}`,
        error,
      );
    }
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
