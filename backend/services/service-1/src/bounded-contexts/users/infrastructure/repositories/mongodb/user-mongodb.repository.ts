import { Injectable, Inject, Logger } from '@nestjs/common';
import { MongoClient, Collection } from 'mongodb';
import { User } from '../../../domain/entities/user.entity';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { Email } from '../../../domain/value-objects/email.vo';
import { Username } from '../../../domain/value-objects/username.vo';
import { UserDTO } from '../../../domain/entities/user.types';
import {
  Criteria,
  InfrastructureException,
  PaginatedRepoResult,
} from '@libs/nestjs-common';
import { MongoCriteriaConverter } from '@libs/nestjs-mongodb';
import { MONGO_CLIENT_TOKEN } from '@libs/nestjs-mongodb';

@Injectable()
export class UserMongodbRepository implements UserRepository {
  private readonly logger = new Logger(UserMongodbRepository.name);
  private readonly collection: Collection<UserDTO>;

  constructor(
    @Inject(MONGO_CLIENT_TOKEN)
    private readonly mongoClient: MongoClient,
  ) {
    this.collection = this.mongoClient.db().collection<UserDTO>('users');
    // Initialize indexes on first connection
    this.initializeIndexes().catch((error) =>
      this.logger.error('Failed to initialize user collection indexes:', error),
    );
  }

  async save(user: User): Promise<void> {
    try {
      const primitives = user.toValue();

      await this.collection.updateOne(
        { id: user.id },
        { $set: { ...primitives } },
        { upsert: true },
      );
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      this.handleDatabaseError('findById', id, error);
    }
  }

  async findByEmail(email: Email): Promise<User | null> {
    try {
      const document = await this.collection.findOne({
        email: email.toValue(),
      });

      if (!document) {
        return null;
      }

      return User.fromValue(document);
    } catch (error: unknown) {
      this.handleDatabaseError('findByEmail', email.toValue(), error);
    }
  }

  async findByUsername(username: Username): Promise<User | null> {
    try {
      const document = await this.collection.findOne({
        username: username.toValue(),
      });

      if (!document) {
        return null;
      }

      return User.fromValue(document);
    } catch (error: unknown) {
      this.handleDatabaseError('findByUsername', username.toValue(), error);
    }
  }

  async existsByEmail(email: Email): Promise<boolean> {
    try {
      const count = await this.collection.countDocuments({
        email: email.toValue(),
      });
      return count > 0;
    } catch (error: unknown) {
      this.handleDatabaseError('existsByEmail', email.toValue(), error);
    }
  }

  async existsByUsername(username: Username): Promise<boolean> {
    try {
      const count = await this.collection.countDocuments({
        username: username.toValue(),
      });
      return count > 0;
    } catch (error: unknown) {
      this.handleDatabaseError('existsByUsername', username.toValue(), error);
    }
  }

  async findAll(): Promise<User[]> {
    try {
      const documents = await this.collection.find().toArray();
      return documents.map((doc) => User.fromValue(doc));
    } catch (error: unknown) {
      this.handleDatabaseError('findAll', '', error);
    }
  }

  async findByCriteria(criteria: Criteria): Promise<PaginatedRepoResult<User>> {
    try {
      const { filter, options } = MongoCriteriaConverter.convert(criteria);

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

      const count = criteria.hasWithTotal()
        ? await this.collection.countDocuments(filter)
        : null;

      const documents = await query.toArray();
      return {
        data: documents.map((doc) => User.fromValue(doc)),
        total: count,
      };
    } catch (error: unknown) {
      this.handleDatabaseError('findByCriteria', '', error);
    }
  }

  async countByCriteria(criteria: Criteria): Promise<number> {
    try {
      const convertedCriteria = MongoCriteriaConverter.convert(criteria);

      const count = await this.collection.countDocuments(
        convertedCriteria?.filter || {},
      );
      return count;
    } catch (error: unknown) {
      this.handleDatabaseError('countByCriteria', 'criteria', error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.collection.deleteOne({ id });
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      this.handleDatabaseError('exists', id, error);
    }
  }

  /**
   * Initialize MongoDB indexes for optimal query performance
   * This method is called once when the repository is instantiated
   */
  private async initializeIndexes(): Promise<void> {
    try {
      // Check if collection exists first
      const collections = await this.mongoClient
        .db()
        .listCollections({ name: 'users' })
        .toArray();
      if (collections.length === 0) {
        // Collection doesn't exist yet, indexes will be created when first document is inserted
        this.logger.log(
          'Users collection does not exist yet, skipping index initialization',
        );
        return;
      }

      // Check if indexes already exist to avoid recreation
      const existingIndexes = await this.collection.indexes();
      const indexNames = existingIndexes.map((idx) => idx.name);

      // Primary unique indexes
      if (!indexNames.includes('idx_user_id')) {
        await this.collection.createIndex(
          { id: 1 },
          {
            unique: true,
            name: 'idx_user_id',
          },
        );
      }

      if (!indexNames.includes('idx_user_email')) {
        await this.collection.createIndex(
          { email: 1 },
          {
            unique: true,
            name: 'idx_user_email',
            collation: { locale: 'en', strength: 2 }, // Case-insensitive
          },
        );
      }

      if (!indexNames.includes('idx_user_username')) {
        await this.collection.createIndex(
          { username: 1 },
          {
            unique: true,
            name: 'idx_user_username',
            collation: { locale: 'en', strength: 2 }, // Case-insensitive
          },
        );
      }

      // Query performance indexes
      if (!indexNames.includes('idx_user_role')) {
        await this.collection.createIndex(
          { role: 1 },
          { name: 'idx_user_role' },
        );
      }

      if (!indexNames.includes('idx_user_status_role')) {
        await this.collection.createIndex(
          { status: 1, role: 1 },
          { name: 'idx_user_status_role' },
        );
      }

      // Name search indexes
      if (!indexNames.includes('idx_user_profile_names')) {
        await this.collection.createIndex(
          {
            'profile.firstName': 1,
            'profile.lastName': 1,
          },
          { name: 'idx_user_profile_names' },
        );
      }

      // Sorting indexes
      if (!indexNames.includes('idx_user_created_desc')) {
        await this.collection.createIndex(
          { createdAt: -1 },
          { name: 'idx_user_created_desc' },
        );
      }

      if (!indexNames.includes('idx_user_updated_desc')) {
        await this.collection.createIndex(
          { updatedAt: -1 },
          { name: 'idx_user_updated_desc' },
        );
      }

      // Compound indexes for common query patterns
      if (!indexNames.includes('idx_user_status_created')) {
        await this.collection.createIndex(
          {
            status: 1,
            createdAt: -1,
          },
          { name: 'idx_user_status_created' },
        );
      }

      this.logger.log('User collection indexes initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing user collection indexes:', error);
      // Don't throw error to avoid breaking application startup
      // Indexes can be created manually or on first document insert
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
    const err = error instanceof Error ? error : new Error(String(error));
    throw new InfrastructureException(operation, id, err);
  }
}
