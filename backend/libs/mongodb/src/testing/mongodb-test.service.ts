import { CorrelationLogger } from '@libs/nestjs-common';
import { MongoClient } from 'mongodb';

export class MongodbTestService {
  readonly mongoClient: MongoClient;
  private readonly logger = new CorrelationLogger(MongodbTestService.name);

  constructor(private readonly dbName: string) {
    const uri =
      process.env.MONGODB_URI || `mongodb://localhost:27017/${this.dbName}?replicaSet=rs0`;
    this.mongoClient = new MongoClient(uri);
  }

  async setupDatabase() {
    try {
      this.logger.debug('Connecting to existing MongoDB instance...');

      await this.mongoClient.connect();

      await this.mongoClient.db(this.dbName).admin().ping();
      await this.mongoClient.db(this.dbName).dropDatabase();

      this.logger.debug('Test setup completed');
    } catch (error) {
      this.logger.error('Error in database setup:', error);
      throw error;
    }
  }

  async cleanupDatabase() {
    try {
      await this.mongoClient.db(this.dbName).dropDatabase();
      this.logger.debug('Cleaned up test database');
    } catch (error) {
      this.logger.error('Error cleaning up test database:', error);
    }
    await this.mongoClient.close();
  }

  async clearCollection(collectionName: string) {
    const db = this.mongoClient.db(this.dbName);
    await db.collection(collectionName).deleteMany({});
  }
}
