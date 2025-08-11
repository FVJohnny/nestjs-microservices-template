import { Module, forwardRef } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KafkaModule } from './kafka/kafka.module';
import { ChannelsModule } from './channels/channels.module';

@Module({
  imports: [
    forwardRef(() => KafkaModule),
    ChannelsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
