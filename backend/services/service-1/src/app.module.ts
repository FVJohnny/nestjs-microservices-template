import { Module } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ChannelsModule } from './ddd/channels/channels.module';
import { HeartbeatModule, CorrelationModule } from '@libs/nestjs-common';
import {
  SharedMongoDBModule,
  MongoDBConfigService,
} from '@libs/nestjs-mongodb';
import { SharedRedisModule } from '@libs/nestjs-redis';
import { SharedKafkaModule } from '@libs/nestjs-kafka';
import { EventsModule } from './events.module';

@Module({
  imports: [
    // Database Modules
    SharedRedisModule,
    SharedMongoDBModule,
    MongooseModule.forRootAsync({
      imports: [SharedMongoDBModule],
      useFactory: (configService: MongoDBConfigService) =>
        configService.getMongoConfig(),
      inject: [MongoDBConfigService],
    }),
    
    // Event Modules
    EventsModule,

    // Common Modules
    HeartbeatModule,
    CorrelationModule,

    // Bounded Contexts
    ChannelsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
