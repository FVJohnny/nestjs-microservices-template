import { Global, Module } from '@nestjs/common';
import { KafkaService } from '@libs/nestjs-kafka';
import { KafkaMessagePublisher } from '@libs/nestjs-ddd';

/**
 * Global messaging module that provides MessagePublisher
 * This module can safely import both KafkaService and KafkaMessagePublisher
 */
@Global()
@Module({
  providers: [
    {
      provide: 'MessagePublisher',
      useFactory: (kafkaService: KafkaService) => {
        return new KafkaMessagePublisher(kafkaService);
      },
      inject: [KafkaService],
    },
  ],
  exports: ['MessagePublisher'],
})
export class MessagingModule {}