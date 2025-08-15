import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedMongoDBModule } from '@libs/nestjs-mongodb';
import { SharedRedisModule } from '@libs/nestjs-redis';
import { SharedPostgreSQLModule } from '@libs/nestjs-postgresql';
import { ChannelMongoSchema } from './ddd/channels/infrastructure/repositories/mongodb/channel.schema';
import { PostgreSQLChannelEntity } from './ddd/channels/infrastructure/repositories/postgresql/channel.schema';

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
    MongooseModule.forRootAsync(
      SharedMongoDBModule.getMongooseConfig()
    ),
    

    // PostgreSQL - Base module for config service
    SharedPostgreSQLModule,
    TypeOrmModule.forRootAsync(
      SharedPostgreSQLModule.getTypeOrmConfig([
        PostgreSQLChannelEntity,
      ])
    ),
  ],
})
export class DatabaseModule {}
