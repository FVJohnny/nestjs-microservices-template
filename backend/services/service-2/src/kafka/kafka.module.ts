import { Module, Inject, forwardRef } from '@nestjs/common';
import { KafkaModule as SharedKafkaModule } from '@libs/nestjs-kafka';
import { EventCounterService } from '../event-counter.service';
import { AppModule } from '../app.module';

// We'll create a factory function that has access to the EventCounterService
let eventCounterServiceInstance: EventCounterService;

// Message handler for service-2
const messageHandler = async ({ topic, partition, message }) => {
  console.log(`[Service-2] Received message from ${topic}:`, {
    partition,
    offset: message.offset,
    value: message.value,
  });
  
  // Increment the event counter if service is available
  if (eventCounterServiceInstance) {
    eventCounterServiceInstance.incrementCounter();
  }
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
  constructor(@Inject(EventCounterService) eventCounterService: EventCounterService) {
    // Store the service instance for use in the message handler
    eventCounterServiceInstance = eventCounterService;
  }
}
