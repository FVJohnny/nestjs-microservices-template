import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '../../../domain/entities/channel.entity';
import { ChannelRepository } from '../../../domain/repositories/channel.repository';
import { PostgreSQLChannelEntity } from './channel.schema';
import { ChannelTypeVO } from '../../../domain/value-objects/channel-type.vo';
import { Criteria } from '@libs/nestjs-common';
import { CorrelationLogger } from '@libs/nestjs-common';
import { ChannelPersistenceException } from '../../errors';
import { PostgresCriteriaConverter } from '@libs/nestjs-postgresql';

@Injectable()
export class PostgreSQLChannelRepository implements ChannelRepository {
  private readonly logger = new CorrelationLogger(
    PostgreSQLChannelRepository.name,
  );

  constructor(
    @InjectRepository(PostgreSQLChannelEntity)
    private readonly channelRepository: Repository<PostgreSQLChannelEntity>,
  ) {}

  async save(channel: Channel): Promise<void> {
    try {
      this.logger.log(`Saving channel: ${channel.id}`);

      const entity = this.mapToEntity(channel);
      await this.channelRepository.save(entity);

      this.logger.log(`Successfully saved channel: ${channel.id}`);
    } catch (error) {
      this.handleDatabaseError('save', channel.id, error);
    }
  }


  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Removing channel with id: ${id}`);

      await this.channelRepository.delete({ id });

      this.logger.log(`Removed channel: ${id}`);
    } catch (error) {
      this.handleDatabaseError('remove', id, error);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      this.logger.log(`Checking if channel exists with id: ${id}`);

      const count = await this.channelRepository.count({
        where: { id },
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
        where: { id },
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

      const baseQueryBuilder = this.channelRepository.createQueryBuilder('channel');
      const queryBuilder = PostgresCriteriaConverter.convert(baseQueryBuilder, criteria, 'channel');
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

      const baseQueryBuilder = this.channelRepository.createQueryBuilder('channel');
      const queryBuilder = PostgresCriteriaConverter.convert(baseQueryBuilder, criteria, 'channel');
      return await queryBuilder.getCount();
    } catch (error) {
      this.handleDatabaseError(
        'countByCriteria',
        JSON.stringify(criteria),
        error,
      );
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
