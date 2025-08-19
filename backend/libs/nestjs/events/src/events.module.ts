import { Global, Module, DynamicModule, Logger, Type } from '@nestjs/common';
import { INTEGRATION_EVENT_PUBLISHER_TOKEN, INTEGRATION_EVENT_LISTENER_TOKEN } from '@libs/nestjs-common';

export type MessagingBackend = 'kafka' | 'redis';

export interface MessagingModules {
  sharedModule: Type<any>;
  service: Type<any>;
  integrationEventPublisher: Type<any>;
  integrationEventListener: Type<any>;
}

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
          provide: INTEGRATION_EVENT_PUBLISHER_TOKEN,
          useFactory: (kafkaService: any) => new modules.integrationEventPublisher(kafkaService),
          inject: [modules.service],
        },
        {
          provide: INTEGRATION_EVENT_LISTENER_TOKEN,
          useFactory: (kafkaService: any) => new modules.integrationEventListener(kafkaService),
          inject: [modules.service],
        },
      ],
      exports: [INTEGRATION_EVENT_PUBLISHER_TOKEN, INTEGRATION_EVENT_LISTENER_TOKEN],
    };
  }

  private static createRedisModule(modules: MessagingModules): DynamicModule {
    return {
      module: ConfigurableEventsModule,
      imports: [modules.sharedModule],
      providers: [
        {
          provide: INTEGRATION_EVENT_PUBLISHER_TOKEN,
          useFactory: (redisService: any) => new modules.integrationEventPublisher(redisService),
          inject: [modules.service],
        },
        {
          provide: INTEGRATION_EVENT_LISTENER_TOKEN,
          useFactory: (redisService: any) => new modules.integrationEventListener(redisService),
          inject: [modules.service],
        },
      ],
      exports: [INTEGRATION_EVENT_PUBLISHER_TOKEN, INTEGRATION_EVENT_LISTENER_TOKEN],
    };
  }

}