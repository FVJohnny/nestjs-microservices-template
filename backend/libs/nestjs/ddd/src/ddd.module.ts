import { Module, DynamicModule } from '@nestjs/common';
import { KafkaMessagePublisher } from './messaging/implementations/kafka-message.publisher';
import { RedisMessagePublisher } from './messaging/implementations/redis-message.publisher';

/**
 * Shared DDD module that provides Domain-Driven Design patterns and abstractions
 * for use across multiple NestJS services.
 */
@Module({})
export class DDDModule {
  /**
   * Configure the DDD module with a specific message publisher type
   */
  static forRoot(): DynamicModule {

    return {
      module: DDDModule,
      providers: [
        KafkaMessagePublisher,
        RedisMessagePublisher,
      ],
      exports: [
        'MessagePublisher',
        'KafkaMessagePublisher',
        'RedisMessagePublisher',
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
        KafkaMessagePublisher,
        RedisMessagePublisher,
      ],
      exports: [
        'MessagePublisher',
        'KafkaMessagePublisher', 
        'RedisMessagePublisher',
      ],
      global: false,
    };
  }
}
