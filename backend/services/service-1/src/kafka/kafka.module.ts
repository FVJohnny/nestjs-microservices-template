import { Module } from '@nestjs/common';
import { KafkaModule as SharedKafkaModule } from '@libs/nestjs-kafka';

@Module({
  imports: [
    SharedKafkaModule.forRoot({
      clientId: 'service-1-publisher',
      groupId: 'service-1-publisher-group',
      topics: [], // No topics to consume - this is only for publishing
    }),
  ],
  providers: [],
  exports: [SharedKafkaModule],
})
export class KafkaModule {
  // This module is purely for publishing events (secondary adapter)
  // All consumption happens via specific consumers in interfaces/messaging/kafka/
}
