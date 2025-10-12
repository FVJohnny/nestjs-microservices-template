import { Module } from '@nestjs/common';
import { AuthBoundedContextModule } from './bounded-contexts/auth/auth.module';
import { NotificationsBoundedContextModule } from './bounded-contexts/notifications/notifications.module';
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
import { Outbox_MongodbRepository } from '@libs/nestjs-mongodb';
import { RedisDBModule } from '@libs/nestjs-redis';
import { MongoDBModule } from '@libs/nestjs-mongodb';
import { KafkaIntegrationEventsModule } from '@libs/nestjs-kafka';

@Module({
  imports: [
    // DATABASE MODULES
    RedisDBModule,
    MongoDBModule,

    // INTEGRATION EVENT MODULES
    InboxModule,
    OutboxModule.forRoot({ repository: Outbox_MongodbRepository }),
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
    NotificationsBoundedContextModule,
  ],
})
export class AppModule {}
