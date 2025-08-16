import { Global, Module, DynamicModule, Logger } from '@nestjs/common';
import {
  SharedKafkaModule,
  KafkaService,
  KafkaEventPublisher,
  KafkaEventListener,
} from '@libs/nestjs-kafka';
import {
  SharedRedisModule,
  RedisService,
  RedisEventPublisher,
  RedisEventListener,
} from '@libs/nestjs-redis';
import {
  EVENT_PUBLISHER_TOKEN,
  EVENT_LISTENER_TOKEN,
} from '@libs/nestjs-common';

/**
 * Global messaging module that provides both EventPublisher and EventListener
 * Supports configurable messaging backend via MESSAGING_BACKEND environment variable
 * Options: 'kafka' or 'redis' (default)
 */
@Global()
@Module({})
export class EventsModule {
  private static readonly logger = new Logger(EventsModule.name);

  static forRoot(): DynamicModule {
    const messagingBackend =
      process.env.MESSAGING_BACKEND?.toLowerCase() || 'redis';

    this.logger.log(
      `[Service-1] Using ${messagingBackend.toUpperCase()} messaging backend`,
    );

    if (messagingBackend === 'kafka') {
      return this.createKafkaModule();
    } else if (messagingBackend === 'redis') {
      return this.createRedisModule();
    }

    const errorMessage = `[Service-1] Unknown messaging backend '${messagingBackend}'. Supported options: 'kafka', 'redis'`;
    this.logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  private static createKafkaModule(): DynamicModule {
    return {
      module: EventsModule,
      imports: [SharedKafkaModule],
      providers: [
        {
          provide: EVENT_PUBLISHER_TOKEN,
          useFactory: (kafkaService: KafkaService) =>
            new KafkaEventPublisher(kafkaService),
          inject: [KafkaService],
        },
        {
          provide: EVENT_LISTENER_TOKEN,
          useFactory: (kafkaService: KafkaService) =>
            new KafkaEventListener(kafkaService),
          inject: [KafkaService],
        },
      ],
      exports: [EVENT_PUBLISHER_TOKEN, EVENT_LISTENER_TOKEN],
    };
  }

  private static createRedisModule(): DynamicModule {
    return {
      module: EventsModule,
      imports: [SharedRedisModule],
      providers: [
        {
          provide: EVENT_PUBLISHER_TOKEN,
          useFactory: (redisService: RedisService) =>
            new RedisEventPublisher(redisService),
          inject: [RedisService],
        },
        {
          provide: EVENT_LISTENER_TOKEN,
          useFactory: (redisService: RedisService) =>
            new RedisEventListener(redisService),
          inject: [RedisService],
        },
      ],
      exports: [EVENT_PUBLISHER_TOKEN, EVENT_LISTENER_TOKEN],
    };
  }
}
