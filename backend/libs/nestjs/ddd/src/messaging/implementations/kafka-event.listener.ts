import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventListener, TopicHandler, EventPayload } from '../interfaces/event-listener.interface';

// Import the actual KafkaService type to avoid interface mismatch
// This will be injected from @libs/nestjs-kafka
type KafkaService = any;

/**
 * Kafka implementation of EventListener
 * Creates Kafka topic handlers that adapt messages to the generic EventPayload format
 */
@Injectable()
export class KafkaEventListener implements EventListener, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaEventListener.name);
  private readonly topicHandlers = new Map<string, TopicHandler>();
  private isListeningFlag = false;

  constructor(private readonly kafkaService: KafkaService) {}

  async onModuleInit() {
    await this.startListening();
  }

  async onModuleDestroy() {
    await this.stopListening();
  }

  async startListening(): Promise<void> {
    if (this.isListeningFlag) {
      this.logger.warn('KafkaEventListener is already listening');
      return;
    }

    this.isListeningFlag = true;
    this.logger.log('KafkaEventListener started listening');
  }

  async stopListening(): Promise<void> {
    if (!this.isListeningFlag) {
      return;
    }

    this.isListeningFlag = false;
    this.logger.log('KafkaEventListener stopped listening');
  }

  registerTopicHandler(handler: TopicHandler): void {
    this.topicHandlers.set(handler.topicName, handler);
    this.logger.log(`Registered topic handler for '${handler.topicName}'`);

    // Create a Kafka handler that adapts messages to EventPayload format
    const kafkaHandler = {
      topicName: handler.topicName,
      handle: async (kafkaMessage: any) => {
        await this.handleKafkaMessage(handler.topicName, kafkaMessage, handler);
      }
    };

    // Register with the KafkaService
    this.kafkaService.registerHandler(kafkaHandler);
  }

  unregisterTopicHandler(topicName: string): void {
    this.topicHandlers.delete(topicName);
    this.logger.log(`Unregistered topic handler for '${topicName}'`);
    // Note: KafkaService doesn't currently support unregistering handlers
  }

  isListening(): boolean {
    return this.isListeningFlag;
  }

  private async handleKafkaMessage(topicName: string, kafkaMessage: any, topicHandler: TopicHandler): Promise<void> {
    try {
      // Extract the actual message data - it's nested in kafkaMessage.message
      const actualMessage = kafkaMessage.message || kafkaMessage;
      const messageValue = actualMessage.value?.toString();
      const messageKey = actualMessage.key?.toString();
      const messageTimestamp = actualMessage.timestamp;

      this.logger.debug(`Processing Kafka message from '${topicName}':`, {
        key: messageKey,
        value: messageValue,
        timestamp: messageTimestamp,
        partition: kafkaMessage.partition,
        offset: actualMessage.offset,
      });

      if (!messageValue) {
        this.logger.warn(`Empty message value from topic '${topicName}' - Full structure:`, kafkaMessage);
        return;
      }

      const parsedMessage = JSON.parse(messageValue) as Record<string, unknown>;
      const messageId = messageKey || `kafka-${Date.now()}-${Math.random()}`;
      const eventName = parsedMessage.eventName as string;

      if (!eventName) {
        this.logger.warn(`Message missing 'eventName' field from topic '${topicName}' [${messageId}] - Parsed:`, parsedMessage);
        return;
      }

      // Convert Kafka message to generic EventPayload
      const eventPayload: EventPayload = {
        messageId,
        eventName,
        data: parsedMessage,
        timestamp: new Date(messageTimestamp ? parseInt(messageTimestamp) : Date.now()),
        source: 'kafka',
      };

      this.logger.log(`🎯 Processing event [${messageId}] - ${eventName} from topic '${topicName}'`);
      
      // Delegate to the topic handler
      await topicHandler.handle(eventPayload);
      
      this.logger.log(`✅ Successfully processed event [${messageId}] - ${eventName}`);
    } catch (error) {
      this.logger.error(`❌ Error handling Kafka message from topic '${topicName}': ${error}`);
      throw error;
    }
  }
}
