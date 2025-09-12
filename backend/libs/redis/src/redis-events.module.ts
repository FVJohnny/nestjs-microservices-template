import { Global, Module } from '@nestjs/common';

import { RedisService } from './redis.service';
import {
  INTEGRATION_EVENT_PUBLISHER_TOKEN,
  INTEGRATION_EVENT_LISTENER_TOKEN,
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
      provide: INTEGRATION_EVENT_PUBLISHER_TOKEN,
      useFactory: (redisService: RedisService) => new RedisIntegrationEventPublisher(redisService),
      inject: [RedisService],
    },
    {
      provide: INTEGRATION_EVENT_LISTENER_TOKEN,
      useFactory: (redisService: RedisService) => new RedisIntegrationEventListener(redisService),
      inject: [RedisService],
    },
  ],
  exports: [RedisService, INTEGRATION_EVENT_PUBLISHER_TOKEN, INTEGRATION_EVENT_LISTENER_TOKEN],
})
export class RedisIntegrationEventsModule {}
