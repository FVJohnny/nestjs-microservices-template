import { Global, Module } from '@nestjs/common';
// import { SharedKafkaModule, KafkaService, KafkaEventPublisher, KafkaEventListener } from '@libs/nestjs-kafka';
import { SharedRedisModule, RedisService, RedisEventPublisher, RedisEventListener } from '@libs/nestjs-redis';
import { 
  EVENT_PUBLISHER_TOKEN,
  EVENT_LISTENER_TOKEN 
} from '@libs/nestjs-common';
import { KafkaEventPublisher, KafkaService, SharedKafkaModule } from '@libs/nestjs-kafka';

/**
 * Global messaging module that provides both EventPublisher and EventListener
 * Uses Redis pub/sub as the event source
 */
@Global()
@Module({
  imports: [/*SharedKafkaModule */ SharedRedisModule],
  providers: [
    {
      provide: EVENT_PUBLISHER_TOKEN,
      //useFactory: (kafkaService: KafkaService) => new KafkaEventPublisher(kafkaService),
      useFactory: (redisService: RedisService) => new RedisEventPublisher(redisService),
      inject: [/* KafkaService */ RedisService],
    },
    {
      provide: EVENT_LISTENER_TOKEN,
      //useFactory: (kafkaService: KafkaService) => new KafkaEventListener(kafkaService),
      useFactory: (redisService: RedisService) => new RedisEventListener(redisService),
      inject: [/* KafkaService */ RedisService],
    },
  ],
  exports: [EVENT_PUBLISHER_TOKEN, EVENT_LISTENER_TOKEN],
})
export class EventsModule {}
