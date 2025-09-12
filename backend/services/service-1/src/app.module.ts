import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from './bounded-contexts/auth/auth.module';
import {
  HeartbeatModule,
  TracingModule,
  ErrorHandlingModule,
  SharedIntegrationEventsModule,
  EventTrackerModule,
} from '@libs/nestjs-common';
import { MetricsModule, MetricsInterceptor } from '@libs/nestjs-common';
import { OutboxModule } from '@libs/nestjs-common';
import { MongoOutboxRepository } from '@libs/nestjs-mongodb';
import { RedisDBModule, RedisIntegrationEventsModule } from '@libs/nestjs-redis';
import { MongoDBModule } from '@libs/nestjs-mongodb';
import { PostgresDBModule } from '@libs/nestjs-postgresql';

@Module({
  imports: [
    // Database Modules
    RedisDBModule,
    MongoDBModule,
    PostgresDBModule,

    // Integration Event Modules
    RedisIntegrationEventsModule,
    // KafkaIntegrationEventsModule,
    OutboxModule.forRoot({ repository: MongoOutboxRepository }),
    EventTrackerModule,

    // Common Modules
    CqrsModule.forRoot(),
    SharedIntegrationEventsModule,
    HeartbeatModule,
    TracingModule,
    ErrorHandlingModule,
    MetricsModule,

    // DDD Bounded Contexts
    AuthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
