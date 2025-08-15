import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SharedMongoDBModule,
  MongoDBConfigService,
} from '@libs/nestjs-mongodb';
import { SharedRedisModule } from '@libs/nestjs-redis';
import { ChannelMongoSchema } from './ddd/channels/infrastructure/repositories/mongodb/channel.schema';

/**
 * Global database module that provides MongoDB and Redis connections
 */
@Global()
@Module({
  imports: [
    // Redis
    SharedRedisModule,

    // Mongo
    SharedMongoDBModule,
    MongooseModule.forRootAsync({
      imports: [SharedMongoDBModule],
      useFactory: (configService: MongoDBConfigService) =>
        configService.getMongoConfig(),
      inject: [MongoDBConfigService],
    }),
    MongooseModule.forFeature([{ name: 'Channel', schema: ChannelMongoSchema }]),
    
  ],
})
export class DatabaseModule {}
