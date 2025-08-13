import { Global, Module, DynamicModule } from '@nestjs/common';
import { KafkaService, KafkaServiceConfig } from './kafka-service';

/**
 * Global Kafka module that provides Kafka services to all modules
 * Can be configured per service with different client/group IDs
 */
@Global()
@Module({})
export class KafkaSharedModule {
  static forRoot(config: KafkaServiceConfig): DynamicModule {
    return {
      module: KafkaSharedModule,
      providers: [
        {
          provide: 'KAFKA_CONFIG',
          useValue: config,
        },
        {
          provide: KafkaService,
          useFactory: (kafkaConfig: KafkaServiceConfig) => {
            return new KafkaService(kafkaConfig);
          },
          inject: ['KAFKA_CONFIG'],
        },
      ],
      exports: [KafkaService],
    };
  }
}