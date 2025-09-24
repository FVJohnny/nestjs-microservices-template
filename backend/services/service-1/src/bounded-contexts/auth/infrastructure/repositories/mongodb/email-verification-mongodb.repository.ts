import { Injectable, Inject } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { EmailVerification } from '@bc/auth/domain/entities/email-verification/email-verification.entity';
import { EmailVerificationDTO } from '@bc/auth/domain/entities/email-verification/email-verification.dto';
import { EmailVerification_Repository } from '@bc/auth/domain/repositories/email-verification/email-verification.repository';
import { Email, Expiration, Verification } from '@bc/auth/domain/value-objects';
import { Id, type RepositoryContext } from '@libs/nestjs-common';
import { MONGO_CLIENT_TOKEN, BaseMongoRepository, IndexSpec } from '@libs/nestjs-mongodb';

@Injectable()
export class EmailVerification_Mongodb_Repository
  extends BaseMongoRepository<EmailVerificationDTO>
  implements EmailVerification_Repository
{
  constructor(@Inject(MONGO_CLIENT_TOKEN) mongoClient: MongoClient) {
    super(mongoClient, 'email_verifications');
  }

  async save(emailVerification: EmailVerification, context?: RepositoryContext) {
    try {
      const session = this.getSession(context);
      await this.collection.updateOne(
        { id: emailVerification.id.toValue() },
        { $set: { ...emailVerification.toValue() } },
        { upsert: true, session },
      );
    } catch (error: unknown) {
      this.handleDatabaseError('save', emailVerification.id.toValue(), error);
    }
  }

  async findById(id: Id, context?: RepositoryContext) {
    try {
      const session = this.getSession(context);
      const document = await this.collection.findOne({ id: id.toValue() }, { session });

      if (!document) {
        return null;
      }

      return EmailVerification.fromValue(document);
    } catch (error: unknown) {
      this.handleDatabaseError('findById', id.toValue(), error);
    }
  }

  async findByUserId(userId: Id, context?: RepositoryContext) {
    try {
      const session = this.getSession(context);
      const document = await this.collection.findOne({ userId: userId.toValue() }, { session });

      if (!document) {
        return null;
      }

      return EmailVerification.fromValue(document);
    } catch (error: unknown) {
      this.handleDatabaseError('findByUserId', userId.toValue(), error);
    }
  }

  async findByEmail(email: Email, context?: RepositoryContext) {
    try {
      const session = this.getSession(context);
      const document = await this.collection.findOne(
        {
          email: email.toValue(),
        },
        { session },
      );

      if (!document) {
        return null;
      }

      return EmailVerification.fromValue(document);
    } catch (error: unknown) {
      this.handleDatabaseError('findByEmail', email.toValue(), error);
    }
  }

  async findPendingByUserId(userId: Id, context?: RepositoryContext) {
    try {
      const session = this.getSession(context);
      const document = await this.collection.findOne(
        {
          userId: userId.toValue(),
          expiration: { $gt: Expiration.atHoursFromNow(0).toValue() },
          verification: { $eq: Verification.notVerified().toValue() },
        },
        { session },
      );

      if (!document) {
        return null;
      }

      return EmailVerification.fromValue(document);
    } catch (error: unknown) {
      this.handleDatabaseError('findPendingByUserId', userId.toValue(), error);
    }
  }

  async remove(id: Id, context?: RepositoryContext) {
    try {
      const session = this.getSession(context);
      await this.collection.deleteOne({ id: id.toValue() }, { session });
    } catch (error: unknown) {
      this.handleDatabaseError('remove', id.toValue(), error);
    }
  }

  async exists(id: Id, context?: RepositoryContext) {
    try {
      const session = this.getSession(context);
      const count = await this.collection.countDocuments({ id: id.toValue() }, { session });
      return count > 0;
    } catch (error: unknown) {
      this.handleDatabaseError('exists', id.toValue(), error);
    }
  }

  async clear(context?: RepositoryContext) {
    try {
      const session = this.getSession(context);
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
          name: 'idx_email_verification_id',
        },
      },
      {
        fields: { userId: 1 },
        options: {
          unique: true,
          name: 'idx_email_verification_user_id',
        },
      },
      {
        fields: { email: 1 },
        options: {
          unique: true,
          name: 'idx_email_verification_email',
          collation: { locale: 'en', strength: 2 }, // Case-insensitive
        },
      },
      {
        fields: { expiration: 1, verification: 1 },
        options: { name: 'idx_email_verification_pending' },
      },
      {
        fields: { expiration: 1 },
        options: { name: 'idx_email_verification_expiration' },
      },
    ];
  }
}
