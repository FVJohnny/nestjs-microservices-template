import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedRedisModule } from '@libs/nestjs-redis';
import { SharedPostgreSQLModule } from '@libs/nestjs-postgresql';
import { PostgreSQLChannelEntity } from './bounded-contexts/channels/infrastructure/repositories/postgresql/channel.schema';
import { MongoDBConfigService, SharedMongoDBModule } from '@libs/nestjs-mongodb';
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
  ],
  exports: []
})
export class DatabaseModule {}
