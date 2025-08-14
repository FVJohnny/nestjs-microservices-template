import { Global, Module, DynamicModule } from '@nestjs/common';
import { EventListener } from './interfaces/event-listener.interface';
import { KafkaEventListener } from './implementations/kafka-event.listener';
import { RedisEventListener } from './implementations/redis-event.listener';

export interface EventListenerModuleOptions {
  type: 'kafka' | 'redis';
  // Add other configuration options as needed
}

/**
 * Global module that provides pluggable EventListener
 * Similar to MessagePublisher pattern - allows switching between Kafka, Redis, etc.
 */
@Global()
@Module({})
export class EventListenerModule {
  static forRoot(options: EventListenerModuleOptions): DynamicModule {
    const eventListenerProvider = {
      provide: 'EventListener',
      useFactory: (...deps: any[]) => {
        switch (options.type) {
          case 'kafka':
            // Assuming KafkaService is available in the deps
            return new KafkaEventListener(deps[0]);
          case 'redis':
            // Assuming RedisClient is available in the deps
            return new RedisEventListener(/* deps[0] */);
          default:
            throw new Error(`Unsupported event listener type: ${options.type}`);
        }
      },
      inject: [
        // Inject dependencies based on the type
        ...(options.type === 'kafka' ? ['KafkaService'] : []),
        ...(options.type === 'redis' ? [/* 'RedisClient' */] : []),
      ],
    };

    return {
      module: EventListenerModule,
      providers: [eventListenerProvider],
      exports: ['EventListener'],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => EventListenerModuleOptions | Promise<EventListenerModuleOptions>;
    inject?: any[];
  }): DynamicModule {
    const eventListenerProvider = {
      provide: 'EventListener',
      useFactory: async (config: EventListenerModuleOptions, ...deps: any[]) => {
        switch (config.type) {
          case 'kafka':
            return new KafkaEventListener(deps[0]);
          case 'redis':
            return new RedisEventListener(/* deps[0] */);
          default:
            throw new Error(`Unsupported event listener type: ${config.type}`);
        }
      },
      inject: ['EVENT_LISTENER_CONFIG', 'KafkaService', /* other deps */],
    };

    const configProvider = {
      provide: 'EVENT_LISTENER_CONFIG',
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    return {
      module: EventListenerModule,
      providers: [configProvider, eventListenerProvider],
      exports: ['EventListener'],
    };
  }
}
