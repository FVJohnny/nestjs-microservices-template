import { Global, Module } from '@nestjs/common';
import { SharedKafkaModule, KafkaService, KafkaEventPublisher, KafkaEventListener } from '@libs/nestjs-kafka';
// import { SharedRedisModule, RedisService, RedisEventPublisher, RedisEventListener } from '@libs/nestjs-redis';
import { 
  EVENT_PUBLISHER_TOKEN,
  EVENT_LISTENER_TOKEN 
} from '@libs/nestjs-common';

/**
 * Global messaging module that provides both EventPublisher and EventListener
 * Uses Kafka as the event source
 */
@Global()
@Module({
  imports: [SharedKafkaModule],
  providers: [
    {
      provide: EVENT_PUBLISHER_TOKEN,
      useFactory: (kafkaService: KafkaService) => new KafkaEventPublisher(kafkaService),
      inject: [KafkaService],
    },
    {
      provide: EVENT_LISTENER_TOKEN,
      useFactory: (kafkaService: KafkaService) => new KafkaEventListener(kafkaService),
      inject: [KafkaService],
    },
  ],
  exports: [EVENT_PUBLISHER_TOKEN, EVENT_LISTENER_TOKEN],
})
export class EventsModule {}
