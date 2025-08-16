import { Module } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ChannelsModule } from './bounded-contexts/channels/channels.module';
import {
  HeartbeatModule,
  CorrelationModule,
  ErrorHandlingModule,
  MessagingController,
} from '@libs/nestjs-common';
import { EventsModule } from './events.module';
import { DatabaseModule } from './database.module';

@Module({
  imports: [
    // Database Modules
    DatabaseModule,

    // Event Modules
    EventsModule.forRoot(),

    // Common Modules
    HeartbeatModule,
    CorrelationModule,
    ErrorHandlingModule,

    // DDD Bounded Contexts
    ChannelsModule,
  ],
  controllers: [MessagingController],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
