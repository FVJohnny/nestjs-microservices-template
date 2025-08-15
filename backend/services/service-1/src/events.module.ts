import { Global, Module } from '@nestjs/common';
import { SharedKafkaModule, KafkaService } from '@libs/nestjs-kafka';
// import { SharedRedisModule } from '@libs/nestjs-redis';
import { 
  KafkaMessagePublisher, 
  KafkaEventListener,
  // RedisMessagePublisher,
  // RedisEventListener,
  MESSAGE_PUBLISHER_TOKEN,
  EVENT_LISTENER_TOKEN 
} from '@libs/nestjs-ddd';

/**
 * Global messaging module that provides both MessagePublisher and EventListener
 * Uses Kafka as the event source
 */
@Global()
@Module({
  imports: [SharedKafkaModule],
  providers: [
    {
      provide: MESSAGE_PUBLISHER_TOKEN,
      useFactory: (kafkaService: KafkaService) => new KafkaMessagePublisher(kafkaService),
      inject: [KafkaService],
    },
    {
      provide: EVENT_LISTENER_TOKEN,
      useFactory: (kafkaService: KafkaService) => new KafkaEventListener(kafkaService),
      inject: [KafkaService],
    },
  ],
  exports: [MESSAGE_PUBLISHER_TOKEN, EVENT_LISTENER_TOKEN],
})
export class EventsModule {}
