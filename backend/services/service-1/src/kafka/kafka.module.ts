import { Global, Module } from '@nestjs/common';
import { KafkaMessagePublisher } from '@libs/nestjs-ddd';
import { KafkaService } from './kafka.service';

/**
 * Global Kafka module that provides Kafka services to all modules
 * without requiring explicit imports
 */
@Global()
@Module({
  providers: [
    // Global Kafka service for all bounded contexts
    KafkaService,
    {
      provide: 'MessagePublisher',
      useFactory: (kafkaService: KafkaService) => {
        return new KafkaMessagePublisher(kafkaService);
      },
      inject: [KafkaService],
    },
  ],
  exports: ['MessagePublisher', KafkaService],
})
export class KafkaModule {}