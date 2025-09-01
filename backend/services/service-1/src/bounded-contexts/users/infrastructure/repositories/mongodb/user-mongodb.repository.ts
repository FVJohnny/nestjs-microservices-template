import { Injectable, Inject } from '@nestjs/common';
import { MongoClient, Collection } from 'mongodb';
import { User } from '../../../domain/entities/user.entity';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { Email } from '../../../domain/value-objects/email.vo';
import { Username } from '../../../domain/value-objects/username.vo';
import { Criteria, InfrastructureException } from '@libs/nestjs-common';
import { MongoCriteriaConverter } from '@libs/nestjs-mongodb';
import { SharedMongoDBModule } from '@libs/nestjs-mongodb';

@Injectable()
export class UserMongodbRepository implements UserRepository {
  private readonly collection: Collection;

  constructor(
    @Inject(SharedMongoDBModule.MONGO_CLIENT_TOKEN) private readonly mongoClient: MongoClient,
  ) {
    this.collection = this.mongoClient.db().collection('users');
  }

  async save(user: User): Promise<void> {
    try {
      const primitives = user.toValue();
      
      await this.collection.updateOne(
        { id: user.id },
        { $set: { ...primitives } },
        { upsert: true }
      );
    } catch (error) {
      this.handleDatabaseError('save', user.id, error);
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const document = await this.collection.findOne({ id });
      
      if (!document) {
        return null;
      }

      return User.fromValue(document);
    } catch (error) {
      this.handleDatabaseError('findById', id, error);
    }
  }

  async findByEmail(email: Email): Promise<User | null> {
    try {
      const document = await this.collection.findOne({ email: email.toValue() });
      
      if (!document) {
        return null;
      }

      return User.fromValue(document);
    } catch (error) {
      this.handleDatabaseError('findByEmail', email.toValue(), error);
    }
  }

  async findByUsername(username: Username): Promise<User | null> {
    try {
      const document = await this.collection.findOne({ username: username.toValue() });
      
      if (!document) {
        return null;
      }

      return User.fromValue(document);
    } catch (error) {
      this.handleDatabaseError('findByUsername', username.toValue(), error);
    }
  }

  async existsByEmail(email: Email): Promise<boolean> {
    try {
      const count = await this.collection.countDocuments({ email: email.toValue() });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError('existsByEmail', email.toValue(), error);
    }
  }

  async existsByUsername(username: Username): Promise<boolean> {
    try {
      const count = await this.collection.countDocuments({ username: username.toValue() });
      return count > 0;
    } catch (error) {
      this.handleDatabaseError('existsByUsername', username.toValue(), error);
    }
  }

  async findAll(): Promise<User[]> {
    try {
      const documents = await this.collection.find().toArray();
      return documents.map(doc => User.fromValue(doc));
    } catch (error) {
      this.handleDatabaseError('findAll', '', error);
    }
  }

  async findByCriteria(criteria: Criteria): Promise<User[]> {

    try {
      const {filter, options} = MongoCriteriaConverter.convert(criteria);
      let query = this.collection.find(filter);
      
      if (options.sort) {
        query = query.sort(options.sort);
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.skip) {
        query = query.skip(options.skip);
      }

      const documents = await query.toArray();
      return documents.map(doc => User.fromValue(doc));
    } catch (error) {
      this.handleDatabaseError('findByCriteria', '', error);
    }
  }

  async countByCriteria(criteria: Criteria): Promise<number> {
    try {
      const convertedCriteria = MongoCriteriaConverter.convert(criteria);

      const count = await this.collection.countDocuments(convertedCriteria?.filter || {});
      return count;
    } catch (error) {
      this.handleDatabaseError('countByCriteria', 'criteria', error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.collection.deleteOne({ id });
    } catch (error) {
      this.handleDatabaseError('delete', id, error);
    }
  }

  async remove(id: string): Promise<void> {
    await this.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    try {
      const count = await this.collection.countDocuments({ id });
      return count > 0;
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
    throw new InfrastructureException(operation, id, cause);
  }
}