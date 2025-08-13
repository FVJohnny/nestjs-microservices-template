import { Injectable } from '@nestjs/common';
import { BaseKafkaConsumerService, KafkaConsumerConfig } from '@libs/nestjs-kafka';
import { ChannelEventsHandler } from '../../../interfaces/messaging/kafka/handlers/channel-events.handler';
import { NotificationEventsHandler } from '../../../interfaces/messaging/kafka/handlers/notification-events.handler';

@Injectable()
export class Service2KafkaConsumerService extends BaseKafkaConsumerService {
  
  constructor(
    private readonly channelEventsHandler: ChannelEventsHandler,
    private readonly notificationEventsHandler: NotificationEventsHandler,
    // Add more handlers as needed for future bounded contexts
  ) {
    // Service-2 specific configuration
    const config: KafkaConsumerConfig = {
      clientId: 'service-2-consumer',
      groupId: 'service-2-consumer-group',
      retryDelayMs: 5000,
    };
    
    super(config);
  }

  protected async registerHandlers(): Promise<void> {
    // Register all handlers for this service
    this.addHandler(this.channelEventsHandler); // Listen to service-1's channel events
    this.addHandler(this.notificationEventsHandler);
    
    // Future bounded contexts can add their handlers here:
    // this.addHandler(this.paymentEventsHandler);
    // this.addHandler(this.inventoryEventsHandler);
    
    this.logger.log(`🔍 Handler registration complete for Service-2. Registered ${this.handlerMap.size} handlers.`);
  }
}