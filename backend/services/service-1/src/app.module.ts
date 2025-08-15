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
import { MessagingModule } from './messaging.module';
import { KafkaService } from '@libs/nestjs-kafka';
import { KafkaMessagePublisher, KafkaEventListener } from '@libs/nestjs-ddd';

@Module({
  imports: [
    SharedMongoDBModule,
    MongooseModule.forRootAsync({
      imports: [SharedMongoDBModule],
      useFactory: (configService: MongoDBConfigService) =>
        configService.getMongoConfig(),
      inject: [MongoDBConfigService],
    }),

    SharedRedisModule,
    SharedKafkaModule,
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
    {
      provide: 'MessagePublisher',
      useFactory: (kafkaService: KafkaService) => {
        return new KafkaMessagePublisher(kafkaService);
      },
      inject: [KafkaService],
    },
    {
      provide: 'EventListener',
      useFactory: (kafkaService: KafkaService) => {
        return new KafkaEventListener(kafkaService);
      },
      inject: [KafkaService],
    },
  ],
})
export class AppModule {}
