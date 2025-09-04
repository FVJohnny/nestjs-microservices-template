import { Global, Module } from '@nestjs/common';
import {
  SharedKafkaModule,
  KafkaService,
  KafkaIntegrationEventPublisher,
  KafkaIntegrationEventListener,
} from '@libs/nestjs-kafka';
import {
  INTEGRATION_EVENT_PUBLISHER_TOKEN,
  INTEGRATION_EVENT_LISTENER_TOKEN,
  EventTrackerService,
} from '@libs/nestjs-common';
// import {
//   SharedRedisModule,
//   RedisService,
//   RedisIntegrationEventPublisher,
//   RedisIntegrationEventListener,
// } from '@libs/nestjs-redis';
@Global()
@Module({
  imports: [SharedKafkaModule],
  providers: [
    {
      provide: INTEGRATION_EVENT_PUBLISHER_TOKEN,
      useFactory: (kafkaService: KafkaService) =>
        new KafkaIntegrationEventPublisher(kafkaService),
      inject: [KafkaService],
    },
    {
      provide: INTEGRATION_EVENT_LISTENER_TOKEN,
      useFactory: (
        kafkaService: KafkaService,
        eventTracker: EventTrackerService,
      ) => new KafkaIntegrationEventListener(kafkaService, eventTracker),
      inject: [KafkaService, EventTrackerService],
    },
  ],
  exports: [
    INTEGRATION_EVENT_PUBLISHER_TOKEN,
    INTEGRATION_EVENT_LISTENER_TOKEN,
  ],
})
export class IntegrationEventsModule {}
