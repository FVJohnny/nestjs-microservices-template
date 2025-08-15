import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SharedMongoDBModule,
  MongoDBConfigService,
} from '@libs/nestjs-mongodb';
import { SharedRedisModule } from '@libs/nestjs-redis';
import { SharedPostgreSQLModule, PostgreSQLConfigService } from '@libs/nestjs-postgresql';
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
    MongooseModule.forRootAsync({
      imports: [SharedMongoDBModule],
      useFactory: (configService: MongoDBConfigService) =>
        configService.getMongoConfig(),
      inject: [MongoDBConfigService],
    }),
    

    // PostgreSQL
    SharedPostgreSQLModule,
    TypeOrmModule.forRootAsync({
      useFactory: (configService: PostgreSQLConfigService) => 
        configService.getPostgreSQLConfig() as any,
      inject: [PostgreSQLConfigService],
    }),

  ],
})
export class DatabaseModule {}
