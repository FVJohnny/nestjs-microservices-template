import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedMongoDBModule } from '@libs/nestjs-mongodb';
import { SharedRedisModule } from '@libs/nestjs-redis';
import { SharedPostgreSQLModule } from '@libs/nestjs-postgresql';
import { PostgreSQLChannelEntity } from './bounded-contexts/channels/infrastructure/repositories/postgresql/channel.schema';
import { MongoClient } from 'mongodb';

/**
 * Global database module that provides MongoDB, Redis, and PostgreSQL connections
 */
@Global()
@Module({
  imports: [
    // Redis
    SharedRedisModule,

    // MongoDB
    SharedMongoDBModule,

    // PostgreSQL - Base module for config service
    SharedPostgreSQLModule,
    TypeOrmModule.forRootAsync(
      SharedPostgreSQLModule.getTypeOrmConfig([PostgreSQLChannelEntity]),
    ),
  ],
  providers: [
        // MongoDB Client Provider
        {
          provide: 'MONGODB_CLIENT',
          useFactory: async (): Promise<MongoClient> => {
            const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
            await client.connect();
            return client;
          },
        },
  ],
  exports: ['MONGODB_CLIENT']
})
export class DatabaseModule {}
