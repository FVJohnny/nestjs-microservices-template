import { Injectable, Optional } from '@nestjs/common';
import { Channel } from '../../../domain/entities/channel.entity';
import { ChannelRepository } from '../../../domain/repositories/channel.repository';
import { Criteria, Operator } from '@libs/nestjs-common';
import { CorrelationLogger } from '@libs/nestjs-common';
import { ChannelPersistenceException } from '../../errors';

@Injectable()
export class InMemoryChannelRepository implements ChannelRepository {
  private readonly logger = new CorrelationLogger(
    InMemoryChannelRepository.name,
  );

  private channels: Map<string, Channel>;

  constructor(@Optional() channels?: Map<string, Channel>) {
    this.channels = channels || new Map();
  }

  async save(channel: Channel): Promise<void> {
    try {
      this.logger.debug(`Saving channel: ${channel.id}`);
      this.channels.set(channel.id, channel);
    } catch (error) {
      this.handleDatabaseError('save', channel.id, error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting channel: ${id}`);
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

  async findById(id: string): Promise<Channel | null> {
    try {
      this.logger.debug(`Finding channel by id: ${id}`);
      return this.channels.get(id) || null;
    } catch (error) {
      this.handleDatabaseError('findById', id, error);
    }
  }

  async findByCriteria(criteria: Criteria): Promise<Channel[]> {
    try {
      this.logger.debug(`Finding channels with criteria`);
      let filtered = Array.from(this.channels.values());

      // Apply filters
      criteria.filters.filters.forEach((filter) => {
        const fieldName = filter.field.value;
        const operator = filter.operator.value;
        const value = filter.value.value;

        filtered = filtered.filter((channel) => {
          let channelValue: any;

          // Get channel field value
          switch (fieldName) {
            case 'userId':
              channelValue = channel.userId;
              break;
            case 'channelType':
              channelValue = channel.channelType.getValue();
              break;
            case 'name':
              channelValue = channel.name;
              break;
            case 'isActive':
              channelValue = channel.isActive;
              break;
            case 'createdAt':
              channelValue = channel.createdAt;
              break;
            default:
              return true;
          }

          // Apply operator
          switch (operator) {
            case Operator.EQUAL:
              return (
                channelValue === value || channelValue?.toString() === value
              );
            case Operator.NOT_EQUAL:
              return channelValue !== value;
            case Operator.CONTAINS:
              return (
                channelValue?.toLowerCase?.()?.includes(value.toLowerCase()) ||
                false
              );
            case Operator.NOT_CONTAINS:
              return !channelValue
                ?.toLowerCase?.()
                ?.includes(value.toLowerCase());
            case Operator.GT:
              return new Date(channelValue) > new Date(value);
            case Operator.LT:
              return new Date(channelValue) < new Date(value);
            default:
              return true;
          }
        });
      });

      return filtered;
    } catch (error) {
      this.handleDatabaseError('findByCriteria', 'criteria', error);
    }
  }

  async countByCriteria(criteria: Criteria): Promise<number> {
    try {
      const channels = await this.findByCriteria(criteria);
      return channels.length;
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
}
