import { Global, Module } from '@nestjs/common';
import { KafkaService } from '@libs/nestjs-kafka';
import { KafkaMessagePublisher, KafkaEventListener } from '@libs/nestjs-ddd';

/**
 * Global messaging module that provides both MessagePublisher and EventListener
 * Uses Kafka as the event source (can be made configurable later)
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
    {
      provide: 'EventListener',
      useFactory: (kafkaService: KafkaService) => {
        return new KafkaEventListener(kafkaService);
      },
      inject: [KafkaService],
    },
  ],
  exports: ['MessagePublisher', 'EventListener'],
})
export class MessagingModule {}
