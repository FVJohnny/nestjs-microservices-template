import { Inject } from '@nestjs/common';
import {
  MongoClient,
  Collection,
  CreateIndexesOptions,
  IndexSpecification,
  MongoServerError,
} from 'mongodb';
import {
  CorrelationLogger,
  SharedAggregateRootDTO,
  AlreadyExistsException,
  InfrastructureException,
} from '@libs/nestjs-common';
import { MONGO_CLIENT_TOKEN } from './mongodb.module';

export interface IndexSpec {
  fields: IndexSpecification;
  options?: CreateIndexesOptions;
}

export abstract class BaseMongoRepository<TDto extends SharedAggregateRootDTO> {
  protected readonly logger: CorrelationLogger;
  protected readonly collection: Collection<TDto>;

  constructor(
    @Inject(MONGO_CLIENT_TOKEN)
    protected readonly mongoClient: MongoClient,
    private readonly collectionName: string,
  ) {
    this.logger = new CorrelationLogger(this.constructor.name);
    this.collection = this.mongoClient.db().collection<TDto>(this.collectionName);
    this.initializeIndexes();
  }

  protected abstract defineIndexes(): IndexSpec[];

  private async initializeIndexes(): Promise<void> {
    try {
      const collections = await this.mongoClient
        .db()
        .listCollections({ name: this.collectionName })
        .toArray();

      if (collections.length === 0) {
        await this.mongoClient.db().createCollection(this.collectionName);
        this.logger.log(`${this.collectionName} collection created and initializing indexes`);
      }

      // Check if indexes already exist to avoid recreation
      const existingIndexes = await this.collection.indexes();
      const indexNames = existingIndexes.map((idx) => idx.name);

      const indexSpecs = this.defineIndexes();

      for (const indexSpec of indexSpecs) {
        const indexName = indexSpec.options?.name;
        if (!indexName) {
          this.logger.warn('Index definition missing name, skipping:', indexSpec.fields);
          continue;
        }

        if (!indexNames.includes(indexName)) {
          await this.collection.createIndex(indexSpec.fields, indexSpec.options);
          this.logger.log(`Created index: ${indexName}`);
        }
      }

      this.logger.log(`${this.collectionName} collection indexes initialized successfully`);
    } catch (error) {
      this.logger.error(
        `Error initializing ${this.collectionName} collection indexes:`,
        error instanceof Error ? error : String(error),
      );
    }
  }

  /**
   * Handle database errors consistently
   */
  protected handleDatabaseError(operation: string, id: string, error: unknown): never {
    const err = error instanceof Error ? error : new Error(String(error));

    // Handle MongoDB duplicate key errors
    if (error instanceof MongoServerError && error.code === 11000) {
      const keyPattern = error.keyPattern;
      const keyValue = error.keyValue;

      if (keyPattern && keyValue) {
        const duplicateKey = Object.keys(keyPattern)[0];
        const duplicateValue = keyValue[duplicateKey] || 'unknown value';
        throw new AlreadyExistsException(duplicateKey, duplicateValue);
      }
    }

    throw new InfrastructureException(operation, id, err);
  }
}
