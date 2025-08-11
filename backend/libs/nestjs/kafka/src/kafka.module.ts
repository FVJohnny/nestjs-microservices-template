import { DynamicModule, Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
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
        KafkaService,
      ],
      exports: [KafkaService],
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
        KafkaService,
      ],
      exports: [KafkaService],
      global: false,
    };
  }
}
