import { Injectable, Inject } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { User_Repository } from '@bc/auth/domain/repositories/user/user.repository';
import { Email, Username } from '@bc/auth/domain/value-objects';
import { UserDTO } from '@bc/auth/domain/entities/user/user.dto';
import { type RepositoryContext } from '@libs/nestjs-common';
import { MONGO_CLIENT_TOKEN, BaseMongoRepository, IndexSpec } from '@libs/nestjs-mongodb';

@Injectable()
export class User_Mongodb_Repository
  extends BaseMongoRepository<User, UserDTO>
  implements User_Repository
{
  constructor(@Inject(MONGO_CLIENT_TOKEN) mongoClient: MongoClient) {
    super(mongoClient, 'users');
  }

  protected toEntity(dto: UserDTO): User {
    return User.fromValue(dto);
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
