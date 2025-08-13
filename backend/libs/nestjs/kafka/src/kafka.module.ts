import { DynamicModule, Module } from '@nestjs/common';
import { KafkaPublisherService } from './kafka-publisher.service';
import { KafkaConsumerService } from './kafka-consumer.service';
import { KafkaController } from './kafka.controller';
import { KafkaModuleOptions, KafkaMessageHandler } from './interfaces/kafka-config.interface';

@Module({})
export class KafkaModule {
  static forRoot(options: KafkaModuleOptions, messageHandler?: KafkaMessageHandler): DynamicModule {
    return {
      module: KafkaModule,
      controllers: [KafkaController],
      providers: [
        {
          provide: 'KAFKA_OPTIONS',
          useValue: options,
        },
        {
          provide: 'KAFKA_MESSAGE_HANDLER',
          useValue: messageHandler,
        },
        // Publisher service (legacy support)
        KafkaPublisherService,
        // Provide legacy KafkaService alias for backward compatibility
        {
          provide: 'KafkaService',
          useExisting: KafkaPublisherService,
        },
        // Consumer service with config
        {
          provide: KafkaConsumerService,
          useFactory: () => new KafkaConsumerService({
            clientId: options.clientId + '-consumer',
            groupId: options.groupId || options.clientId + '-group',
            brokers: options.brokers,
            retryDelayMs: 5000,
          }),
        },
      ],
      exports: [KafkaPublisherService, KafkaConsumerService, 'KafkaService'],
      global: false,
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<KafkaModuleOptions> | KafkaModuleOptions;
    inject?: any[];
    messageHandler?: KafkaMessageHandler;
  }): DynamicModule {
    return {
      module: KafkaModule,
      controllers: [KafkaController],
      providers: [
        {
          provide: 'KAFKA_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: 'KAFKA_MESSAGE_HANDLER',
          useValue: options.messageHandler,
        },
        // Publisher service
        KafkaPublisherService,
        // Provide legacy KafkaService alias for backward compatibility
        {
          provide: 'KafkaService',
          useExisting: KafkaPublisherService,
        },
        // Consumer service with async config
        {
          provide: KafkaConsumerService,
          useFactory: async (...args: any[]) => {
            const kafkaOptions = await options.useFactory(...args);
            return new KafkaConsumerService({
              clientId: kafkaOptions.clientId + '-consumer',
              groupId: kafkaOptions.groupId || kafkaOptions.clientId + '-group',
              brokers: kafkaOptions.brokers,
              retryDelayMs: 5000,
            });
          },
          inject: options.inject || [],
        },
      ],
      exports: [KafkaPublisherService, KafkaConsumerService, 'KafkaService'],
      global: false,
    };
  }
}
