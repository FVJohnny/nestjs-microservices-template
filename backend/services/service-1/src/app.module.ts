import { Module } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { KafkaModule } from './kafka/kafka.module';
import { ChannelsModule } from './channels/channels.module';
import { HeartbeatModule } from '@libs/nestjs-common';

@Module({
  imports: [
    KafkaModule,
    ChannelsModule,
    HeartbeatModule,
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
