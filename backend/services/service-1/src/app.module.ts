import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthBoundedContextModule } from './bounded-contexts/auth/auth.module';
import {
  HeartbeatModule,
  TracingModule,
  ErrorHandlingModule,
  EventTrackerModule,
} from '@libs/nestjs-common';
import { MetricsModule, JwtAuthModule } from '@libs/nestjs-common';
import { OutboxModule } from '@libs/nestjs-common';
import { MongoOutboxRepository } from '@libs/nestjs-mongodb';
import { RedisDBModule, RedisIntegrationEventsModule } from '@libs/nestjs-redis';
import { MongoDBModule } from '@libs/nestjs-mongodb';
import { PostgresDBModule } from '@libs/nestjs-postgresql';

@Module({
  imports: [
    // DATABASE MODULES
    RedisDBModule,
    MongoDBModule,
    PostgresDBModule,

    // INTEGRATION EVENT MODULES
    RedisIntegrationEventsModule,
    // KafkaIntegrationEventsModule,
    OutboxModule.forRoot({ repository: MongoOutboxRepository }),
    EventTrackerModule,

    // COMMON MODULES
    CqrsModule.forRoot(),
    HeartbeatModule,
    TracingModule,
    ErrorHandlingModule,
    MetricsModule,
    JwtAuthModule,

    // BOUNDED CONTEXTS
    AuthBoundedContextModule,
  ],
})
export class AppModule {}
