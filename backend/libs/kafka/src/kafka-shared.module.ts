import { Global, Module } from '@nestjs/common';
import { KafkaService } from './kafka-service';
import { KafkaIntegrationEventPublisher, KafkaIntegrationEventListener } from './index';
import {
  INTEGRATION_EVENT_PUBLISHER,
  INTEGRATION_EVENT_LISTENER,
  IntegrationEventsController,
} from '@libs/nestjs-common';

@Global()
@Module({
  controllers: [IntegrationEventsController],
  providers: [
    KafkaService,
    {
      provide: INTEGRATION_EVENT_PUBLISHER,
      useFactory: (kafkaService: KafkaService) => new KafkaIntegrationEventPublisher(kafkaService),
      inject: [KafkaService],
    },
    {
      provide: INTEGRATION_EVENT_LISTENER,
      useFactory: (kafkaService: KafkaService) => new KafkaIntegrationEventListener(kafkaService),
      inject: [KafkaService],
    },
  ],
  exports: [KafkaService, INTEGRATION_EVENT_PUBLISHER, INTEGRATION_EVENT_LISTENER],
})
export class KafkaIntegrationEventsModule {}
