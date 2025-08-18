import { Module } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { ChannelsModule } from './bounded-contexts/channels/channels.module';
import {
  HeartbeatModule,
  CorrelationModule,
  ErrorHandlingModule,
  AuditModule,
  MessagingController,
} from '@libs/nestjs-common';
import { ConfigurableEventsModule } from '@libs/nestjs-events';
import { SharedKafkaModule, KafkaService, KafkaEventPublisher, KafkaEventListener } from '@libs/nestjs-kafka';
import { SharedRedisModule, RedisService, RedisEventPublisher, RedisEventListener } from '@libs/nestjs-redis';
import { DatabaseModule } from './database.module';
import { MetricsModule, MetricsInterceptor } from '@libs/nestjs-common';

@Module({
  imports: [
    // Database Modules
    DatabaseModule,

    // Event Modules
    ConfigurableEventsModule.forRoot({
      kafka: { sharedModule: SharedKafkaModule, service: KafkaService, eventPublisher: KafkaEventPublisher, eventListener: KafkaEventListener },
      redis: { sharedModule: SharedRedisModule, service: RedisService, eventPublisher: RedisEventPublisher, eventListener: RedisEventListener }
    }),

    // CQRS (Global for all bounded contexts)
    CqrsModule.forRoot(),

    // Common Modules
    HeartbeatModule,
    CorrelationModule,
    ErrorHandlingModule,
    AuditModule,
    MetricsModule,

    // DDD Bounded Contexts
    ChannelsModule,
  ],
  controllers: [MessagingController],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}

