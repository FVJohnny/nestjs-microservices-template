import { Injectable, Inject } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { User_Repository } from '@bc/auth/domain/repositories/user/user.repository';
import { Email, Username } from '@bc/auth/domain/value-objects';
import { UserDTO } from '@bc/auth/domain/entities/user/user.dto';
import { Criteria, PaginatedRepoResult, Id, type RepositoryContext } from '@libs/nestjs-common';
import {
  MongoCriteriaConverter,
  MONGO_CLIENT_TOKEN,
  BaseMongoRepository,
  IndexSpec,
} from '@libs/nestjs-mongodb';

@Injectable()
export class User_Mongodb_Repository
  extends BaseMongoRepository<UserDTO>
  implements User_Repository
{
  constructor(@Inject(MONGO_CLIENT_TOKEN) mongoClient: MongoClient) {
    super(mongoClient, 'users');
  }

  async save(user: User, context?: RepositoryContext) {
    try {
      const primitives = user.toValue();
      const session = this.getTransactionSession(context);

      await this.collection.updateOne(
        { id: user.id.toValue() },
        { $set: { ...primitives } },
        { upsert: true, session },
      );
    } catch (error: unknown) {
      this.handleDatabaseError('save', user.id.toValue(), error);
    }
  }

  async findById(id: Id, context?: RepositoryContext) {
    try {
      const session = this.getTransactionSession(context);
      const document = await this.collection.findOne({ id: id.toValue() }, { session });

      if (!document) {
        return null;
      }

      return User.fromValue(document);
    } catch (error: unknown) {
      this.handleDatabaseError('findById', id.toValue(), error);
    }
  }

  async findByEmail(email: Email, context?: RepositoryContext) {
    try {
      const session = this.getTransactionSession(context);
      const document = await this.collection.findOne(
        {
          email: email.toValue(),
        },
        { session },
      );

      if (!document) {
        return null;
      }

      return User.fromValue(document);
    } catch (error: unknown) {
      this.handleDatabaseError('findByEmail', email.toValue(), error);
    }
  }

  async findByUsername(username: Username, context?: RepositoryContext) {
    try {
      const session = this.getTransactionSession(context);
      const document = await this.collection.findOne(
        {
          username: username.toValue(),
        },
        { session },
      );

      if (!document) {
        return null;
      }

      return User.fromValue(document);
    } catch (error: unknown) {
      this.handleDatabaseError('findByUsername', username.toValue(), error);
    }
  }

  async existsByEmail(email: Email, context?: RepositoryContext) {
    try {
      const session = this.getTransactionSession(context);
      const count = await this.collection.countDocuments(
        {
          email: email.toValue(),
        },
        { session },
      );
      return count > 0;
    } catch (error: unknown) {
      this.handleDatabaseError('existsByEmail', email.toValue(), error);
    }
  }

  async existsByUsername(username: Username, context?: RepositoryContext) {
    try {
      const session = this.getTransactionSession(context);
      const count = await this.collection.countDocuments(
        {
          username: username.toValue(),
        },
        { session },
      );
      return count > 0;
    } catch (error: unknown) {
      this.handleDatabaseError('existsByUsername', username.toValue(), error);
    }
  }

  async findAll(context?: RepositoryContext) {
    try {
      const session = this.getTransactionSession(context);
      const documents = await this.collection.find({}, { session }).toArray();
      return documents.map((doc) => User.fromValue(doc));
    } catch (error: unknown) {
      this.handleDatabaseError('findAll', '', error);
    }
  }

  async findByCriteria(
    criteria: Criteria,
    context?: RepositoryContext,
  ): Promise<PaginatedRepoResult<User>> {
    try {
      const session = this.getTransactionSession(context);
      const converter = new MongoCriteriaConverter<UserDTO>(this.collection);
      const queryResult = await converter.executeQuery(criteria, session);

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

  async count(criteria: Criteria, context?: RepositoryContext) {
    return this.countByCriteria(criteria, context);
  }

  async countByCriteria(criteria: Criteria, context?: RepositoryContext) {
    try {
      const session = this.getTransactionSession(context);
      const converter = new MongoCriteriaConverter<UserDTO>(this.collection);
      return await converter.count(criteria, session);
    } catch (error: unknown) {
      this.handleDatabaseError('countByCriteria', 'criteria', error);
    }
  }

  async remove(id: Id, context?: RepositoryContext) {
    try {
      const session = this.getTransactionSession(context);
      await this.collection.deleteOne({ id: id.toValue() }, { session });
    } catch (error: unknown) {
      this.handleDatabaseError('remove', id.toValue(), error);
    }
  }

  async exists(id: Id, context?: RepositoryContext) {
    try {
      const session = this.getTransactionSession(context);
      const count = await this.collection.countDocuments({ id: id.toValue() }, { session });
      return count > 0;
    } catch (error: unknown) {
      this.handleDatabaseError('exists', id.toValue(), error);
    }
  }

  async clear(context?: RepositoryContext) {
    try {
      const session = this.getTransactionSession(context);
      await this.collection.deleteMany({}, { session });
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
