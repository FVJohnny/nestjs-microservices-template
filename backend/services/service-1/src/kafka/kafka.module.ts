import { Module, Inject, forwardRef } from '@nestjs/common';
import { KafkaModule as SharedKafkaModule, KafkaService } from '@libs/nestjs-kafka';
import { AppModule } from '../app.module';

// Message handler for service-1
const messageHandler = async ({ topic, partition, message }) => {
  console.log(`[Service-1] Received message from ${topic}:`, {
    partition,
    offset: message.offset,
    value: message.value,
  });
};

@Module({
  imports: [
    SharedKafkaModule.forRoot(
      {
        clientId: 'service-1',
        groupId: 'service-1-group',
        topics: ['example-topic'],
      },
      messageHandler
    ),
    forwardRef(() => AppModule),
  ],
  providers: [
    {
      provide: 'SHARED_KAFKA_SERVICE',
      useExisting: KafkaService,
    },
  ],
  exports: [SharedKafkaModule, 'SHARED_KAFKA_SERVICE'],
})
export class KafkaModule {
}
