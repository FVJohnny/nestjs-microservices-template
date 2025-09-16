import { Global, Module } from '@nestjs/common';

import { RedisService } from './redis.service';
import {
  INTEGRATION_EVENT_PUBLISHER,
  INTEGRATION_EVENT_LISTENER,
  IntegrationEventsController,
} from '@libs/nestjs-common';
import { RedisIntegrationEventListener } from './redis.integration-event-listener';
import { RedisIntegrationEventPublisher } from './redis.integration-event-publisher';

@Global()
@Module({
  controllers: [IntegrationEventsController],
  providers: [
    RedisService,
    {
      provide: INTEGRATION_EVENT_PUBLISHER,
      useFactory: (redisService: RedisService) => new RedisIntegrationEventPublisher(redisService),
      inject: [RedisService],
    },
    {
      provide: INTEGRATION_EVENT_LISTENER,
      useFactory: (redisService: RedisService) => new RedisIntegrationEventListener(redisService),
      inject: [RedisService],
    },
  ],
  exports: [RedisService, INTEGRATION_EVENT_PUBLISHER, INTEGRATION_EVENT_LISTENER],
})
export class RedisIntegrationEventsModule {}
