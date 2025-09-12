import { Global, Module } from '@nestjs/common';
import { KafkaService } from './kafka-service';
import { KafkaIntegrationEventPublisher, KafkaIntegrationEventListener } from './index';
import {
  INTEGRATION_EVENT_PUBLISHER_TOKEN,
  INTEGRATION_EVENT_LISTENER_TOKEN,
  IntegrationEventsController,
} from '@libs/nestjs-common';

@Global()
@Module({
  controllers: [IntegrationEventsController],
  providers: [
    KafkaService,
    {
      provide: INTEGRATION_EVENT_PUBLISHER_TOKEN,
      useFactory: (kafkaService: KafkaService) => new KafkaIntegrationEventPublisher(kafkaService),
      inject: [KafkaService],
    },
    {
      provide: INTEGRATION_EVENT_LISTENER_TOKEN,
      useFactory: (kafkaService: KafkaService) => new KafkaIntegrationEventListener(kafkaService),
      inject: [KafkaService],
    },
  ],
  exports: [KafkaService, INTEGRATION_EVENT_PUBLISHER_TOKEN, INTEGRATION_EVENT_LISTENER_TOKEN],
})
export class KafkaIntegrationEventsModule {}
