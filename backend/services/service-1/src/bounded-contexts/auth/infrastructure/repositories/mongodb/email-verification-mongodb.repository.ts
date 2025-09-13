import { Injectable, Inject } from '@nestjs/common';
import { MongoClient, Collection, MongoServerError } from 'mongodb';
import {
  EmailVerification,
  EmailVerificationDTO,
} from '../../../domain/entities/email-verification/email-verification.entity';
import { EmailVerificationRepository } from '../../../domain/repositories/email-verification/email-verification.repository';
import { Email, Expiration, Verification } from '../../../domain/value-objects';
import { InfrastructureException, AlreadyExistsException, Id } from '@libs/nestjs-common';
import { MONGO_CLIENT_TOKEN } from '@libs/nestjs-mongodb';
import { CorrelationLogger } from '@libs/nestjs-common';

@Injectable()
export class EmailVerificationMongodbRepository implements EmailVerificationRepository {
  private readonly logger = new CorrelationLogger(EmailVerificationMongodbRepository.name);
  private readonly collection: Collection<EmailVerificationDTO>;

  constructor(
    @Inject(MONGO_CLIENT_TOKEN)
    private readonly mongoClient: MongoClient,
  ) {
    this.collection = this.mongoClient.db().collection<EmailVerificationDTO>('email_verifications');
    // Initialize indexes on first connection
    this.initializeIndexes().catch((error) =>
      this.logger.error('Failed to initialize email verification collection indexes:', error),
    );
  }

  async save(emailVerification: EmailVerification): Promise<void> {
    try {
      await this.collection.updateOne(
        { id: emailVerification.id.toValue() },
        { $set: { ...emailVerification.toValue() } },
        { upsert: true },
      );
    } catch (error: unknown) {
      this.handleDatabaseError('save', emailVerification.id.toValue(), error);
    }
  }

  async findById(id: Id): Promise<EmailVerification | null> {
    try {
      const document = await this.collection.findOne({ id: id.toValue() });

      if (!document) {
        return null;
      }

      return EmailVerification.fromValue(document);
    } catch (error: unknown) {
      this.handleDatabaseError('findById', id.toValue(), error);
    }
  }

  async findByToken(token: Id): Promise<EmailVerification | null> {
    try {
      const document = await this.collection.findOne({ token: token.toValue() });

      if (!document) {
        return null;
      }

      return EmailVerification.fromValue(document);
    } catch (error: unknown) {
      this.handleDatabaseError('findByToken', token.toValue(), error);
    }
  }

  async findByUserId(userId: Id): Promise<EmailVerification | null> {
    try {
      const document = await this.collection.findOne({ userId: userId.toValue() });

      if (!document) {
        return null;
      }

      return EmailVerification.fromValue(document);
    } catch (error: unknown) {
      this.handleDatabaseError('findByUserId', userId.toValue(), error);
    }
  }

  async findByEmail(email: Email): Promise<EmailVerification | null> {
    try {
      const document = await this.collection.findOne({
        email: email.toValue(),
      });

      if (!document) {
        return null;
      }

      return EmailVerification.fromValue(document);
    } catch (error: unknown) {
      this.handleDatabaseError('findByEmail', email.toValue(), error);
    }
  }

  async findPendingByUserId(userId: Id): Promise<EmailVerification | null> {
    try {
      const document = await this.collection.findOne({
        userId: userId.toValue(),
        expiration: { $gt: Expiration.hoursFromNow(0).toValue() },
        verification: { $eq: Verification.notVerified().toValue() },
      });

      if (!document) {
        return null;
      }

      return EmailVerification.fromValue(document);
    } catch (error: unknown) {
      this.handleDatabaseError('findPendingByUserId', userId.toValue(), error);
    }
  }

  async findPendingByToken(token: Id): Promise<EmailVerification | null> {
    try {
      const document = await this.collection.findOne({
        token: token.toValue(),
        expiration: { $gt: new Date() },
        verification: { $eq: Verification.notVerified().toValue() },
      });

      if (!document) {
        return null;
      }

      return EmailVerification.fromValue(document);
    } catch (error: unknown) {
      this.handleDatabaseError('findPendingByToken', token.toValue(), error);
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

  /**
   * Initialize MongoDB indexes for optimal query performance
   * This method is called once when the repository is instantiated
   */
  private async initializeIndexes(): Promise<void> {
    try {
      // Check if collection exists first
      const collections = await this.mongoClient
        .db()
        .listCollections({ name: 'email_verifications' })
        .toArray();
      if (collections.length === 0) {
        // Collection doesn't exist yet, indexes will be created when first document is inserted
        this.logger.log(
          'Email verifications collection does not exist yet, skipping index initialization',
        );
        return;
      }

      // Check if indexes already exist to avoid recreation
      const existingIndexes = await this.collection.indexes();
      const indexNames = existingIndexes.map((idx) => idx.name);

      // Primary unique indexes
      if (!indexNames.includes('idx_email_verification_id')) {
        await this.collection.createIndex(
          { id: 1 },
          {
            unique: true,
            name: 'idx_email_verification_id',
          },
        );
      }

      if (!indexNames.includes('idx_email_verification_user_id')) {
        await this.collection.createIndex(
          { userId: 1 },
          {
            unique: true,
            name: 'idx_email_verification_user_id',
          },
        );
      }

      if (!indexNames.includes('idx_email_verification_email')) {
        await this.collection.createIndex(
          { email: 1 },
          {
            unique: true,
            name: 'idx_email_verification_email',
            collation: { locale: 'en', strength: 2 }, // Case-insensitive
          },
        );
      }

      if (!indexNames.includes('idx_email_verification_token')) {
        await this.collection.createIndex(
          { token: 1 },
          {
            unique: true,
            name: 'idx_email_verification_token',
          },
        );
      }

      // Query performance indexes
      if (!indexNames.includes('idx_email_verification_pending')) {
        await this.collection.createIndex(
          { expiration: 1, verification: 1 },
          { name: 'idx_email_verification_pending' },
        );
      }

      if (!indexNames.includes('idx_email_verification_expiration')) {
        await this.collection.createIndex(
          { expiration: 1 },
          { name: 'idx_email_verification_expiration' },
        );
      }

      this.logger.log('Email verification collection indexes initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing email verification collection indexes:', error);
      // Don't throw error to avoid breaking application startup
      // Indexes can be created manually or on first document insert
    }
  }

  /**
   * Handle database errors consistently
   */
  private handleDatabaseError(operation: string, id: string, error: unknown): never {
    const err = error instanceof Error ? error : new Error(String(error));

    // Handle MongoDB duplicate key errors
    if (error instanceof MongoServerError && error.code === 11000) {
      const keyPattern = error.keyPattern;

      if (keyPattern?.userId) {
        throw new AlreadyExistsException('userId', id);
      }
      if (keyPattern?.email) {
        // Extract email value from the error details
        const emailValue = error.keyValue?.email || 'unknown email';
        throw new AlreadyExistsException('email', emailValue);
      }
      if (keyPattern?.token) {
        throw new AlreadyExistsException('token', id);
      }
    }

    throw new InfrastructureException(operation, id, err);
  }
}
