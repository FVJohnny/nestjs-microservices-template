import { MongooseModule } from '@nestjs/mongoose';

/**
 * Creates a pre-configured MongooseModule for use in AppModules
 * Reads configuration from environment variables with sensible defaults
 */
export const createMongoDBModule = () => {
  return MongooseModule.forRoot(
    process.env.MONGODB_URI || 'mongodb://localhost:27017',
    {
      dbName: process.env.MONGODB_DB_NAME || 'nestjs-app',
      retryWrites: true,
      w: 'majority' as any,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
    }
  );
};