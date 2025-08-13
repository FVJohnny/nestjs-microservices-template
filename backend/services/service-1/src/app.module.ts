import { Module } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { KafkaModule } from './kafka/kafka.module';
import { MongoDBModule } from './mongodb/mongodb.module';
import { ChannelsModule } from './channels/channels.module';
import { HeartbeatModule, CorrelationModule } from '@libs/nestjs-common';

@Module({
  imports: [
    CorrelationModule,
    MongoDBModule,
    KafkaModule,
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
