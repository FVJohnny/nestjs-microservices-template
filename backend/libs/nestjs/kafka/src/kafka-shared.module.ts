import { Global, Module, DynamicModule } from '@nestjs/common';
import { KafkaService, KafkaServiceConfig } from './kafka-service';
import { KafkaController } from './kafka.controller';

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
      controllers: [KafkaController],
      providers: [
        {
          provide: KafkaService,
          useFactory: () => {
            return new KafkaService(config);
          },
        },
      ],
      exports: [KafkaService],
    };
  }
}