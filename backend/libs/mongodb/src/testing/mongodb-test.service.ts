import type { SharedAggregateRootDTO } from '@libs/nestjs-common';
import { CorrelationLogger } from '@libs/nestjs-common';
import { MongoClient } from 'mongodb';
import { MongoDBConfigService } from '../mongodb-config.service';

export class MongodbTestService<T extends SharedAggregateRootDTO> {
  readonly mongoClient: MongoClient;
  private readonly logger = new CorrelationLogger(MongodbTestService.name);

  constructor(private collectionName: string) {
    const mongoConfigService = new MongoDBConfigService();
    const uri = mongoConfigService.getConnectionString();

    this.logger.log(`MongoDB connection string: ${uri}`);
    this.mongoClient = new MongoClient(uri);
  }

  async setupDatabase() {
    try {
      this.logger.debug('Connecting to existing MongoDB instance...');

      await this.mongoClient.connect();

      await this.mongoClient.db().admin().ping();

      this.logger.debug('Test setup completed');
    } catch (error) {
      this.logger.error('Error in database setup:', error);
      throw error;
    }
  }

  getCollection() {
    return this.mongoClient.db().collection<T>(this.collectionName);
  }

  async setInitialData(data: T[]) {
    if (data.length === 0) return;

    await this.mongoClient.db().collection(this.collectionName).insertMany(data);
  }

  async clearCollection() {
    await this.mongoClient.db().collection(this.collectionName).deleteMany({});
  }

  async cleanup() {
    await this.mongoClient.db().collection(this.collectionName).drop();
    await this.mongoClient.close();
  }
}
