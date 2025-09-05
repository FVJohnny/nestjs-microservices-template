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
} from '@libs/nestjs-common';
import { EventTrackerModule } from '@libs/nestjs-common';
// import {
//   SharedRedisModule,
//   RedisService,
//   RedisIntegrationEventPublisher,
//   RedisIntegrationEventListener,
// } from '@libs/nestjs-redis';
@Global()
@Module({
  imports: [SharedKafkaModule, EventTrackerModule],
  providers: [
    {
      provide: INTEGRATION_EVENT_PUBLISHER_TOKEN,
      useFactory: (kafkaService: KafkaService) =>
        new KafkaIntegrationEventPublisher(kafkaService),
      inject: [KafkaService],
    },
    {
      provide: INTEGRATION_EVENT_LISTENER_TOKEN,
      useFactory: (kafkaService: KafkaService) =>
        new KafkaIntegrationEventListener(kafkaService),
      inject: [KafkaService],
    },
  ],
  exports: [
    INTEGRATION_EVENT_PUBLISHER_TOKEN,
    INTEGRATION_EVENT_LISTENER_TOKEN,
  ],
})
export class IntegrationEventsModule {}
