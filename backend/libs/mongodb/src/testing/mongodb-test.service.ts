import { MongoClient } from 'mongodb';

export class MongodbTestService {
  readonly mongoClient: MongoClient;

  constructor(private readonly dbName: string) {
    const uri =
      process.env.MONGODB_URI ||
      `mongodb://admin:admin123@localhost:27017/${this.dbName}?authSource=admin`;
    this.mongoClient = new MongoClient(uri);
  }

  async setupDatabase(): Promise<void> {
    try {
      console.log('Connecting to existing MongoDB instance...');

      await this.mongoClient.connect();

      await this.mongoClient.db(this.dbName).admin().ping();

      console.log('Test setup completed');
    } catch (error) {
      console.error('Error in database setup:', error);
      throw error;
    }
  }

  async cleanupDatabase(): Promise<void> {
    try {
      await this.mongoClient.db(this.dbName).dropDatabase();
      console.log('Cleaned up test database');
    } catch (error) {
      console.error('Error cleaning up test database:', error);
    }
    await this.mongoClient.close();
  }

  async clearCollection(collectionName: string): Promise<void> {
    const db = this.mongoClient.db(this.dbName);
    await db.collection(collectionName).deleteMany({});
  }
}
