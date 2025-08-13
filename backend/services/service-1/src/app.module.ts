import { Module } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ChannelsModule } from './ddd/channels/channels.module';
import { HeartbeatModule, CorrelationModule, SharedMongoDBModule } from '@libs/nestjs-common';
import { KafkaSharedModule, KafkaService } from '@libs/nestjs-kafka';
import { KafkaMessagePublisher } from '@libs/nestjs-ddd';

@Module({
  imports: [
    KafkaSharedModule.forRoot({
      clientId: 'service-1',
      groupId: 'service-1',
      retryDelayMs: 5000,
    }), // Import first to make it available globally
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
    HeartbeatModule,
    ChannelsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: 'MessagePublisher',
      useFactory: (kafkaService: KafkaService) => {
        return new KafkaMessagePublisher(kafkaService);
      },
      inject: [KafkaService],
    },
  ],
  exports: ['MessagePublisher'],
})
export class AppModule {}
