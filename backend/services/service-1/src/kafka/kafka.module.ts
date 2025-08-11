import { Module, Inject, forwardRef } from '@nestjs/common';
import { KafkaModule as SharedKafkaModule, KafkaService } from '@libs/nestjs-kafka';
import { EventCounterService } from '../event-counter.service';
import { AppModule } from '../app.module';

// We'll create a factory function that has access to the EventCounterService
let eventCounterServiceInstance: EventCounterService;

// Message handler for service-1
const messageHandler = async ({ topic, partition, message }) => {
  console.log(`[Service-1] Received message from ${topic}:`, {
    partition,
    offset: message.offset,
    value: message.value,
  });
  
  // Increment the event counter if service is available
  if (eventCounterServiceInstance) {
    console.log(`[Service-1] Incrementing event counter...`);
    eventCounterServiceInstance.incrementCounter();
    console.log(`[Service-1] Event counter incremented to ${eventCounterServiceInstance.getCounter()}`);
  }
};

@Module({
  imports: [
    SharedKafkaModule.forRoot(
      {
        clientId: 'service-1',
        groupId: 'service-1-group',
        topics: ['example-topic', 'channel-events', 'message-events'],
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
  constructor(@Inject(EventCounterService) eventCounterService: EventCounterService) {
    // Store the service instance for use in the message handler
    eventCounterServiceInstance = eventCounterService;
  }
}
