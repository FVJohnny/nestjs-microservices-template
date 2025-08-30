import { Module, DynamicModule } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { UsersModule } from './bounded-contexts/users/users.module';
import {
  HeartbeatModule,
  CorrelationModule,
  ErrorHandlingModule,
  AuditModule,
  MessagingController,
} from '@libs/nestjs-common';
import { DatabaseModule } from './database.module';
import { IntegrationEventsModule } from './integration-events.module';
import { MetricsModule, MetricsInterceptor } from '@libs/nestjs-common';

@Module({
  imports: [
    // Database Modules
    DatabaseModule,

    // Event Modules
    IntegrationEventsModule,

    // CQRS (Global for all bounded contexts)
    CqrsModule.forRoot(),

    // Common Modules
    HeartbeatModule,
    CorrelationModule,
    ErrorHandlingModule,
    AuditModule,
    MetricsModule,

    // DDD Bounded Contexts
    UsersModule,
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
