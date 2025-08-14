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
import { KafkaSharedModule } from '@libs/nestjs-kafka';
import { MessagingModule } from './messaging.module';

@Module({
  imports: [
    SharedMongoDBModule,
    MongooseModule.forRootAsync({
      imports: [SharedMongoDBModule],
      useFactory: (configService: MongoDBConfigService) =>
        configService.getMongoConfig(),
      inject: [MongoDBConfigService],
    }),

    KafkaSharedModule.forRoot({
      clientId: 'service-1',
      groupId: 'service-1',
      retryDelayMs: 5000,
    }),
    HeartbeatModule,
    CorrelationModule,
    MessagingModule,
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
