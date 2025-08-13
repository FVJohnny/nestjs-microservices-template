import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  KafkaConsumerService,
  KafkaConsumerServiceConfig,
} from '@libs/nestjs-kafka';
import { ChannelEventsHandler } from '../../../interfaces/messaging/kafka/handlers/channel-events.handler';
import { NotificationEventsHandler } from '../../../interfaces/messaging/kafka/handlers/notification-events.handler';

@Injectable()
export class Service2KafkaConsumerService implements OnModuleInit {
  private kafkaConsumer: KafkaConsumerService;

  constructor(
    private readonly channelEventsHandler: ChannelEventsHandler,
    private readonly notificationEventsHandler: NotificationEventsHandler,
    // Add more handlers as needed for future bounded contexts
  ) {
    // Service-2 specific configuration
    const config: KafkaConsumerServiceConfig = {
      clientId: 'service-2-consumer',
      groupId: 'service-2-consumer-group',
      retryDelayMs: 5000,
    };

    this.kafkaConsumer = new KafkaConsumerService(config);
  }

  async onModuleInit() {
    // Initialize the consumer
    await this.kafkaConsumer.onModuleInit();

    // Register all handlers for this service
    this.kafkaConsumer.registerHandler(this.channelEventsHandler); // Listen to service-1's channel events
    this.kafkaConsumer.registerHandler(this.notificationEventsHandler);

    // Future bounded contexts can add their handlers here:
    // this.kafkaConsumer.registerHandler(this.paymentEventsHandler);
    // this.kafkaConsumer.registerHandler(this.inventoryEventsHandler);

    // Subscribe to registered topics
    await this.kafkaConsumer.subscribeToRegisteredTopics();
  }

  // Expose stats and other methods if needed
  getStats() {
    return this.kafkaConsumer.getStats();
  }

  isReady() {
    return this.kafkaConsumer.isReady();
  }
}
