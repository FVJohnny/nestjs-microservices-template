import { Module } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { UsersModule } from './bounded-contexts/users/users.module';
import {
  HeartbeatModule,
  TracingModule,
  ErrorHandlingModule,
  SharedIntegrationEventsModule,
  EventTrackerModule,
} from '@libs/nestjs-common';
import { DatabaseModule } from './database.module';
import { IntegrationEventsModule } from './integration-events.module';
import { MetricsModule, MetricsInterceptor } from '@libs/nestjs-common';
import { OutboxModule } from '@libs/nestjs-common';

@Module({
  imports: [
    EventTrackerModule,

    // Database Modules
    DatabaseModule,

    // Event Modules
    IntegrationEventsModule,
    OutboxModule.forRoot(),

    // Common Modules
    CqrsModule.forRoot(),
    SharedIntegrationEventsModule,
    HeartbeatModule,
    TracingModule,
    ErrorHandlingModule,
    MetricsModule,

    // DDD Bounded Contexts
    UsersModule,
  ],
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
