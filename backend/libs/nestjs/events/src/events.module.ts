import { Global, Module, DynamicModule, Logger, Type } from '@nestjs/common';
import { EVENT_PUBLISHER_TOKEN, EVENT_LISTENER_TOKEN } from '@libs/nestjs-common';

export type MessagingBackend = 'kafka' | 'redis';

export interface MessagingModules {
  sharedModule: Type<any>;
  service: Type<any>;
  eventPublisher: Type<any>;
  eventListener: Type<any>;
}

/**
 * Global messaging module that provides both EventPublisher and EventListener
 * Supports configurable messaging backend via MESSAGING_BACKEND environment variable
 * Options: 'kafka' or 'redis' (default)
 * 
 * Features:
 * - No module resolution issues: Uses injected dependencies
 * - Environment variable configuration: MESSAGING_BACKEND=kafka|redis
 * - Shareable across multiple services
 * 
 * Usage:
 * import { ConfigurableEventsModule } from '@libs/nestjs-events';
 * import { SharedKafkaModule, KafkaService, KafkaEventPublisher, KafkaEventListener } from '@libs/nestjs-kafka';
 * import { SharedRedisModule, RedisService, RedisEventPublisher, RedisEventListener } from '@libs/nestjs-redis';
 * 
 * @Module({
 *   imports: [
 *     ConfigurableEventsModule.forRoot({
 *       kafka: { sharedModule: SharedKafkaModule, service: KafkaService, eventPublisher: KafkaEventPublisher, eventListener: KafkaEventListener },
 *       redis: { sharedModule: SharedRedisModule, service: RedisService, eventPublisher: RedisEventPublisher, eventListener: RedisEventListener }
 *     })
 *   ],
 * })
 */
@Global()
@Module({})
export class ConfigurableEventsModule {
  private static readonly logger = new Logger(ConfigurableEventsModule.name);

  static forRoot(modules: {
    kafka?: MessagingModules;
    redis?: MessagingModules;
  }, backend?: MessagingBackend): DynamicModule {
    const messagingBackend = (backend || process.env.MESSAGING_BACKEND?.toLowerCase() || 'redis') as MessagingBackend;

    this.logger.log(`Using ${messagingBackend.toUpperCase()} messaging backend`);

    if (messagingBackend === 'kafka') {
      if (!modules.kafka) {
        throw new Error('Kafka backend selected but Kafka modules not provided. Please import Kafka dependencies.');
      }
      return this.createKafkaModule(modules.kafka);
    } else if (messagingBackend === 'redis') {
      if (!modules.redis) {
        throw new Error('Redis backend selected but Redis modules not provided. Please import Redis dependencies.');
      }
      return this.createRedisModule(modules.redis);
    }

    const errorMessage = `Unknown messaging backend '${messagingBackend}'. Supported options: 'kafka', 'redis'`;
    this.logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  private static createKafkaModule(modules: MessagingModules): DynamicModule {
    return {
      module: ConfigurableEventsModule,
      imports: [modules.sharedModule],
      providers: [
        {
          provide: EVENT_PUBLISHER_TOKEN,
          useFactory: (kafkaService: any) => new modules.eventPublisher(kafkaService),
          inject: [modules.service],
        },
        {
          provide: EVENT_LISTENER_TOKEN,
          useFactory: (kafkaService: any) => new modules.eventListener(kafkaService),
          inject: [modules.service],
        },
      ],
      exports: [EVENT_PUBLISHER_TOKEN, EVENT_LISTENER_TOKEN],
    };
  }

  private static createRedisModule(modules: MessagingModules): DynamicModule {
    return {
      module: ConfigurableEventsModule,
      imports: [modules.sharedModule],
      providers: [
        {
          provide: EVENT_PUBLISHER_TOKEN,
          useFactory: (redisService: any) => new modules.eventPublisher(redisService),
          inject: [modules.service],
        },
        {
          provide: EVENT_LISTENER_TOKEN,
          useFactory: (redisService: any) => new modules.eventListener(redisService),
          inject: [modules.service],
        },
      ],
      exports: [EVENT_PUBLISHER_TOKEN, EVENT_LISTENER_TOKEN],
    };
  }

}