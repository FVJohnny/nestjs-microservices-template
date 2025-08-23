import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Channel } from '../../../domain/entities/channel.entity';
import { ChannelRepository } from '../../../domain/repositories/channel.repository';
import { PostgreSQLChannelEntity } from './channel.schema';
import { ChannelTypeVO } from '../../../domain/value-objects/channel-type.vo';
import { Criteria, Operator } from '@libs/nestjs-common';
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

  async findByCriteria(criteria: Criteria): Promise<Channel[]> {
    try {
      this.logger.log(
        `Finding channels with criteria: ${JSON.stringify(criteria)}`,
      );

      const queryBuilder = this.buildCriteriaQuery(criteria);
      const entities = await queryBuilder.getMany();

      return entities.map((entity) => this.mapToDomain(entity));
    } catch (error) {
      this.handleDatabaseError(
        'findByCriteria',
        JSON.stringify(criteria),
        error,
      );
    }
  }

  async countByCriteria(criteria: Criteria): Promise<number> {
    try {
      this.logger.log(
        `Counting channels with criteria: ${JSON.stringify(criteria)}`,
      );

      const queryBuilder = this.buildCriteriaQuery(criteria);
      return await queryBuilder.getCount();
    } catch (error) {
      this.handleDatabaseError(
        'countByCriteria',
        JSON.stringify(criteria),
        error,
      );
    }
  }

  private buildCriteriaQuery(
    criteria: Criteria,
  ): SelectQueryBuilder<PostgreSQLChannelEntity> {
    let queryBuilder = this.channelRepository.createQueryBuilder('channel');

    // Apply filters
    criteria.filters.filters.forEach((filter, index) => {
      const paramName = `param_${index}`;
      const fieldName = `channel.${filter.field.value}`;

      switch (filter.operator.value) {
        case Operator.EQUAL:
          if (index === 0) {
            queryBuilder = queryBuilder.where(`${fieldName} = :${paramName}`, {
              [paramName]: filter.value.value,
            });
          } else {
            queryBuilder = queryBuilder.andWhere(
              `${fieldName} = :${paramName}`,
              { [paramName]: filter.value.value },
            );
          }
          break;
        case Operator.NOT_EQUAL:
          if (index === 0) {
            queryBuilder = queryBuilder.where(`${fieldName} != :${paramName}`, {
              [paramName]: filter.value.value,
            });
          } else {
            queryBuilder = queryBuilder.andWhere(
              `${fieldName} != :${paramName}`,
              { [paramName]: filter.value.value },
            );
          }
          break;
        case Operator.GT:
          if (index === 0) {
            queryBuilder = queryBuilder.where(`${fieldName} > :${paramName}`, {
              [paramName]: filter.value.value,
            });
          } else {
            queryBuilder = queryBuilder.andWhere(
              `${fieldName} > :${paramName}`,
              { [paramName]: filter.value.value },
            );
          }
          break;
        case Operator.LT:
          if (index === 0) {
            queryBuilder = queryBuilder.where(`${fieldName} < :${paramName}`, {
              [paramName]: filter.value.value,
            });
          } else {
            queryBuilder = queryBuilder.andWhere(
              `${fieldName} < :${paramName}`,
              { [paramName]: filter.value.value },
            );
          }
          break;
        case Operator.CONTAINS:
          if (index === 0) {
            queryBuilder = queryBuilder.where(
              `LOWER(${fieldName}) LIKE LOWER(:${paramName})`,
              { [paramName]: `%${filter.value.value}%` },
            );
          } else {
            queryBuilder = queryBuilder.andWhere(
              `LOWER(${fieldName}) LIKE LOWER(:${paramName})`,
              { [paramName]: `%${filter.value.value}%` },
            );
          }
          break;
        case Operator.NOT_CONTAINS:
          if (index === 0) {
            queryBuilder = queryBuilder.where(
              `LOWER(${fieldName}) NOT LIKE LOWER(:${paramName})`,
              { [paramName]: `%${filter.value.value}%` },
            );
          } else {
            queryBuilder = queryBuilder.andWhere(
              `LOWER(${fieldName}) NOT LIKE LOWER(:${paramName})`,
              { [paramName]: `%${filter.value.value}%` },
            );
          }
          break;
      }
    });

    // Apply ordering
    if (criteria.order.hasOrder()) {
      queryBuilder = queryBuilder.orderBy(
        `channel.${criteria.order.orderBy.value}`,
        criteria.order.orderType.isAsc() ? 'ASC' : 'DESC',
      );
    }

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
