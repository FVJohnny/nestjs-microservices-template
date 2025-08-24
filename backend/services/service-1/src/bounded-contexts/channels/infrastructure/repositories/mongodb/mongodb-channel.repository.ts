import { Injectable, Inject } from '@nestjs/common';
import { MongoClient, Collection } from 'mongodb';
import { Channel } from '../../../domain/entities/channel.entity';
import { ChannelRepository } from '../../../domain/repositories/channel.repository';
import { Criteria, MongoCriteriaConverter } from '@libs/nestjs-common';
import { CorrelationLogger } from '@libs/nestjs-common';
import { ChannelPersistenceException } from '../../errors';
import { SharedMongoDBModule } from '@libs/nestjs-mongodb';

@Injectable()
export class MongoDBChannelRepository implements ChannelRepository {
  private readonly logger = new CorrelationLogger(
    MongoDBChannelRepository.name,
  );

  private readonly collection: Collection;

  constructor(
    @Inject(SharedMongoDBModule.MONGO_CLIENT_TOKEN) private readonly mongoClient: MongoClient,
  ) {
    this.collection = this.mongoClient.db().collection('channels');
  }

  async save(channel: Channel): Promise<void> {
    try {
      const primitives = channel.toPrimitives();

      await this.collection.updateOne(
        { id: channel.id },
        { $set: { ...primitives, updatedAt: new Date() } },
        { upsert: true }
      );

    } catch (error) {
      this.handleDatabaseError('save', channel.id, error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Removing channel with id: ${id}`);
      // Soft delete by setting isActive to false
      const result = await this.collection.deleteOne(
        { id },
      );

      if (result.deletedCount === 0) {
        throw new Error(`Channel with id ${id} not found`);
      }

      this.logger.log(`Soft deleted channel: ${id}`);
    } catch (error) {
      this.handleDatabaseError('remove', id, error);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      this.logger.log(`Checking if channel exists with id: ${id}`);
      const count = await this.collection.countDocuments({
        id,
      });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError('exists', id, error);
    }
  }

  async findById(id: string): Promise<Channel | null> {
    try {
      this.logger.log(`Finding channel by id: ${id}`);
      const entity = await this.collection.findOne({ id });
      return entity ? Channel.fromPrimitives(entity) : null;
    } catch (error) {
      this.handleDatabaseError('findById', id, error);
    }
  }

  async findByCriteria(criteria: Criteria): Promise<Channel[]> {
    try {
      this.logger.log(`Finding channels with criteria: ${JSON.stringify(criteria)}`);
      
      const { filter, options } = MongoCriteriaConverter.convert(criteria);
      console.log(filter, options)
      const channelDocs = await this.collection.find(filter, options).toArray();
      return channelDocs.map((doc: any) => Channel.fromPrimitives(doc));
    } catch (error) {
      console.error(error) 
      this.handleDatabaseError('findByCriteria', '', error);
    }
  }

  async countByCriteria(criteria: Criteria): Promise<number> {
    try {
      this.logger.log(`Counting channels with criteria`);
      
      const { filter } = MongoCriteriaConverter.convert(criteria);
      
      return await this.collection.countDocuments(filter);
    } catch (error) {
      this.handleDatabaseError('countByCriteria', 'criteria', error);
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
