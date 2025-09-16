import { Injectable, Inject } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { UserRepository } from '@bc/auth/domain/repositories/user/user.repository';
import { Email, Username } from '@bc/auth/domain/value-objects';
import { UserDTO } from '@bc/auth/domain/entities/user/user.dto';
import { Criteria, PaginatedRepoResult, Id } from '@libs/nestjs-common';
import {
  MongoCriteriaConverter,
  MONGO_CLIENT_TOKEN,
  BaseMongoRepository,
  IndexSpec,
} from '@libs/nestjs-mongodb';

@Injectable()
export class UserMongodbRepository extends BaseMongoRepository<UserDTO> implements UserRepository {
  constructor(@Inject(MONGO_CLIENT_TOKEN) mongoClient: MongoClient) {
    super(mongoClient, 'users');
  }

  async save(user: User): Promise<void> {
    try {
      const primitives = user.toValue();

      await this.collection.updateOne(
        { id: user.id.toValue() },
        { $set: { ...primitives } },
        { upsert: true },
      );
    } catch (error: unknown) {
      this.handleDatabaseError('save', user.id.toValue(), error);
    }
  }

  async findById(id: Id): Promise<User | null> {
    try {
      const document = await this.collection.findOne({ id: id.toValue() });

      if (!document) {
        return null;
      }

      return User.fromValue(document);
    } catch (error: unknown) {
      this.handleDatabaseError('findById', id.toValue(), error);
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
      const converter = new MongoCriteriaConverter<UserDTO>(this.collection);
      const queryResult = await converter.executeQuery(criteria);

      return {
        data: queryResult.data.map((doc) => User.fromValue(doc)),
        total: queryResult.total,
        cursor: queryResult.cursor,
        hasNext: queryResult.hasNext,
      };
    } catch (error: unknown) {
      this.handleDatabaseError('findByCriteria', '', error);
    }
  }

  async count(criteria: Criteria): Promise<number> {
    return this.countByCriteria(criteria);
  }

  async countByCriteria(criteria: Criteria): Promise<number> {
    try {
      const converter = new MongoCriteriaConverter<UserDTO>(this.collection);
      return await converter.count(criteria);
    } catch (error: unknown) {
      this.handleDatabaseError('countByCriteria', 'criteria', error);
    }
  }

  async remove(id: Id): Promise<void> {
    try {
      await this.collection.deleteOne({ id: id.toValue() });
    } catch (error: unknown) {
      this.handleDatabaseError('remove', id.toValue(), error);
    }
  }

  async exists(id: Id): Promise<boolean> {
    try {
      const count = await this.collection.countDocuments({ id: id.toValue() });
      return count > 0;
    } catch (error: unknown) {
      this.handleDatabaseError('exists', id.toValue(), error);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.collection.deleteMany({});
    } catch (error: unknown) {
      this.handleDatabaseError('clear', '', error);
    }
  }

  protected defineIndexes(): IndexSpec[] {
    return [
      {
        fields: { id: 1 },
        options: {
          unique: true,
          name: 'idx_user_id',
        },
      },
      {
        fields: { email: 1 },
        options: {
          unique: true,
          name: 'idx_user_email',
          collation: { locale: 'en', strength: 2 }, // Case-insensitive
        },
      },
      {
        fields: { username: 1 },
        options: {
          unique: true,
          name: 'idx_user_username',
          collation: { locale: 'en', strength: 2 }, // Case-insensitive
        },
      },
      {
        fields: { role: 1 },
        options: { name: 'idx_user_role' },
      },
    ];
  }
}
