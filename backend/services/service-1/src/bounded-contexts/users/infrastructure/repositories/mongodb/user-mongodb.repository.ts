import { Injectable, Inject } from '@nestjs/common';
import { MongoClient, Collection } from 'mongodb';
import { User } from '../../../domain/entities/user.entity';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { Email } from '../../../domain/value-objects/email.vo';
import { Username } from '../../../domain/value-objects/username.vo';
import { UserStatusEnum } from '../../../domain/value-objects/user-status.vo';
import { Criteria } from '@libs/nestjs-common';
import { MongoCriteriaConverter } from '@libs/nestjs-mongodb';
import { SharedMongoDBModule } from '@libs/nestjs-mongodb';
import { CorrelationLogger } from '@libs/nestjs-common';

@Injectable()
export class UserMongodbRepository implements UserRepository {
  private readonly logger = new CorrelationLogger(UserMongodbRepository.name);
  private readonly collection: Collection;

  constructor(
    @Inject(SharedMongoDBModule.MONGO_CLIENT_TOKEN) private readonly mongoClient: MongoClient,
  ) {
    this.collection = this.mongoClient.db().collection('users');
  }

  async save(user: User): Promise<void> {
    try {
      const primitives = user.toPrimitives();
      
      await this.collection.updateOne(
        { id: user.id },
        { $set: { ...primitives, updatedAt: new Date() } },
        { upsert: true }
      );
    } catch (error) {
      this.logger.error(`Failed to save user ${user.id}`, error);
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const document = await this.collection.findOne({ id });
      
      if (!document) {
        return null;
      }

      return User.fromPrimitives(document);
    } catch (error) {
      this.logger.error(`Failed to find user by id ${id}`, error);
      throw error;
    }
  }

  async findByEmail(email: Email): Promise<User | null> {
    try {
      const document = await this.collection.findOne({ email: email.toValue() });
      
      if (!document) {
        return null;
      }

      return User.fromPrimitives(document);
    } catch (error) {
      this.logger.error(`Failed to find user by email ${email.toValue()}`, error);
      throw error;
    }
  }

  async findByUsername(username: Username): Promise<User | null> {
    try {
      const document = await this.collection.findOne({ username: username.toValue() });
      
      if (!document) {
        return null;
      }

      return User.fromPrimitives(document);
    } catch (error) {
      this.logger.error(`Failed to find user by username ${username}`, error);
      throw error;
    }
  }

  async existsByEmail(email: Email): Promise<boolean> {
    try {
      const count = await this.collection.countDocuments({ email: email.toValue() });
      return count > 0;
    } catch (error) {
      this.logger.error(`Failed to check if email exists ${email.toValue()}`, error);
      throw error;
    }
  }

  async existsByUsername(username: Username): Promise<boolean> {
    try {
      const count = await this.collection.countDocuments({ username: username.toValue() });
      return count > 0;
    } catch (error) {
      this.logger.error(`Failed to check if username exists ${username}`, error);
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    try {
      const documents = await this.collection.find().toArray();
      return documents.map(doc => User.fromPrimitives(doc));
    } catch (error) {
      this.logger.error('Failed to find all users', error);
      throw error;
    }
  }

  async findByCriteria(criteria: Criteria): Promise<User[]> {

    try {
      let query = this.collection.find();

      if (criteria.filters) {
        const mongoFilter = MongoCriteriaConverter.convert(criteria);
        query = this.collection.find(mongoFilter);
      }

      if (criteria.order) {
        const sortOptions: any = {};
        sortOptions[criteria.order.orderBy.toValue()] = criteria.order.orderType.isAsc() ? 1 : -1;
        query = query.sort(sortOptions);
      }

      if (criteria.limit) {
        query = query.limit(criteria.limit);
      }

      if (criteria.offset) {
        query = query.skip(criteria.offset);
      }

      const documents = await query.toArray();
      return documents.map(doc => User.fromPrimitives(doc));
    } catch (error) {
      this.logger.error('Failed to find users by criteria', error);
      throw error;
    }
  }

  async countByCriteria(criteria: Criteria): Promise<number> {
    try {
      let filter = {};

      if (criteria.filters) {
        filter = MongoCriteriaConverter.convert(criteria);
      }

      const count = await this.collection.countDocuments(filter);
      return count;
    } catch (error) {
      this.logger.error('Failed to count users by criteria', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.collection.deleteOne({ id });
    } catch (error) {
      this.logger.error(`Failed to delete user ${id}`, error);
      throw error;
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
      this.logger.error(`Failed to check if user exists ${id}`, error);
      throw error;
    }
  }
}