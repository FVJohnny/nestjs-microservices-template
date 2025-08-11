import { Module, Inject, forwardRef } from '@nestjs/common';
import { KafkaModule as SharedKafkaModule } from '@libs/nestjs-kafka';
import { AppModule } from '../app.module';

// Message handler for service-2
const messageHandler = async ({ topic, partition, message }) => {
  console.log(`[Service-2] Received message from ${topic}:`, {
    partition,
    offset: message.offset,
    value: message.value,
  });
};

@Module({
  imports: [
    SharedKafkaModule.forRoot(
      {
        clientId: 'service-2',
        groupId: 'service-2-group',
        topics: ['example-topic'],
      },
      messageHandler
    ),
    forwardRef(() => AppModule),
  ],
  exports: [SharedKafkaModule],
})
export class KafkaModule {
  
}
