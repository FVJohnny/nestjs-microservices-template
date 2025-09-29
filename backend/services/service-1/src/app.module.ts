import { Module } from '@nestjs/common';
import { AuthBoundedContextModule } from './bounded-contexts/auth/auth.module';
import {
  HeartbeatModule,
  TracingModule,
  ErrorHandlingModule,
  EventTrackerModule,
  SharedCqrsModule,
  InboxModule,
  ApiRateLimitModule,
} from '@libs/nestjs-common';
import { MetricsModule, JwtAuthModule } from '@libs/nestjs-common';
import { OutboxModule } from '@libs/nestjs-common';
import { Outbox_Mongodb_Repository } from '@libs/nestjs-mongodb';
import { RedisDBModule } from '@libs/nestjs-redis';
import { MongoDBModule } from '@libs/nestjs-mongodb';
import { PostgresDBModule } from '@libs/nestjs-postgresql';
import { KafkaIntegrationEventsModule } from '@libs/nestjs-kafka';

@Module({
  imports: [
    // DATABASE MODULES
    RedisDBModule,
    MongoDBModule,
    PostgresDBModule,

    // INTEGRATION EVENT MODULES
    InboxModule,
    OutboxModule.forRoot({ repository: Outbox_Mongodb_Repository }),
    // RedisIntegrationEventsModule,
    KafkaIntegrationEventsModule,

    // COMMON MODULES
    SharedCqrsModule,
    HeartbeatModule,
    TracingModule,
    ErrorHandlingModule,
    MetricsModule,
    JwtAuthModule,
    EventTrackerModule,
    ApiRateLimitModule.forRoot({ '1minute': { type: 'ip', limit: 100 } }),

    // BOUNDED CONTEXTS
    AuthBoundedContextModule,
  ],
})
export class AppModule {}
