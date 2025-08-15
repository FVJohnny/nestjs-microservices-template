import { Module, DynamicModule } from '@nestjs/common';
import { KafkaEventPublisher } from './messaging/implementations/kafka-event.publisher';
import { RedisEventPublisher } from './messaging/implementations/redis-event.publisher';

/**
 * Shared DDD module that provides Domain-Driven Design patterns and abstractions
 * for use across multiple NestJS services.
 */
@Module({})
export class DDDModule {
  /**
   * Configure the DDD module with a specific event publisher type
   */
  static forRoot(): DynamicModule {

    return {
      module: DDDModule,
      providers: [
        KafkaEventPublisher,
        RedisEventPublisher,
      ],
      exports: [
        'EventPublisher',
        'KafkaEventPublisher',
        'RedisEventPublisher',
      ],
      global: false,
    };
  }

  /**
   * Configure the DDD module with all available providers
   */
  static forRootWithAllProviders(): DynamicModule {
    return {
      module: DDDModule,
      providers: [
        KafkaEventPublisher,
        RedisEventPublisher,
      ],
      exports: [
        'EventPublisher',
        'KafkaEventPublisher', 
        'RedisEventPublisher',
      ],
      global: false,
    };
  }
}
