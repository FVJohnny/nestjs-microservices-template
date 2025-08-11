import { Module } from '@nestjs/common';
import { KafkaModule as SharedKafkaModule } from '@libs/nestjs-kafka';

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
  ],
  exports: [SharedKafkaModule],
})
export class KafkaModule {}
