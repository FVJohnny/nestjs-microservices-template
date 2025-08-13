import { Module } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { KafkaModule } from './kafka/kafka.module';
import { ChannelsModule } from './channels/channels.module';
import { SharedModule } from './shared/shared.module';
import { HeartbeatModule, CorrelationModule, SharedMongoDBModule } from '@libs/nestjs-common';

@Module({
  imports: [
    CorrelationModule,
    SharedMongoDBModule.forRoot({
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      dbName: process.env.MONGODB_DB_NAME || 'service-1-db',
      connectionOptions: {
        retryWrites: true,
        w: 'majority',
      },
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017',
      {
        dbName: process.env.MONGODB_DB_NAME || 'service-1-db',
        retryWrites: true,
        w: 'majority',
      }
    ),
    KafkaModule,
    SharedModule,
    HeartbeatModule,
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
