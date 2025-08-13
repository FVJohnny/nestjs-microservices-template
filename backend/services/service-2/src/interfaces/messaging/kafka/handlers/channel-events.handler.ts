import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  KafkaTopicHandler,
  KafkaMessagePayload,
  KafkaPublisherService,
} from '@libs/nestjs-kafka';

@Injectable()
export class ChannelEventsHandler implements KafkaTopicHandler {
  private readonly logger = new Logger(ChannelEventsHandler.name);
  readonly topicName = 'channel-events';

  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaService: KafkaPublisherService,
  ) {}

  async handle(payload: KafkaMessagePayload): Promise<void> {
    const startTime = Date.now();
    let messageId = 'unknown';

    try {
      const messageValue = payload.message.value;
      if (!messageValue) {
        this.logger.warn('🚫 Received empty message, skipping');
        return;
      }

      const data = JSON.parse(messageValue);
      messageId = payload.message.offset;

      this.logger.debug(
        `📢 [Service-2] Processing channel event from Service-1 [${messageId}]: ${JSON.stringify(data)}`,
      );

      // Handle ChannelRegisteredEvent
      if (data.eventName === 'ChannelRegisteredEvent') {
        await this.handleChannelRegistered(data);
      } else {
        this.logger.warn(`❓ Unknown channel event: ${data.eventName}`);
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `✅ [Service-2] Channel event [${messageId}] processed successfully in ${processingTime}ms`,
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `❌ [Service-2] Error processing channel event [${messageId}] after ${processingTime}ms: ${error}`,
      );

      // Classify error for retry logic
      if (this.isRetriableError(error)) {
        this.logger.warn(
          `🔄 Retriable error, will retry message [${messageId}]: ${error}`,
        );
        throw error; // Re-throw for retry
      } else {
        this.logger.error(
          `🚫 Non-retriable error, skipping message [${messageId}]: ${error}`,
        );
        // Don't re-throw, message will be marked as processed
      }
    }
  }

  private async handleChannelRegistered(data: any): Promise<void> {
    this.logger.log(
      `📢 [Service-2] Channel registered by Service-1 - Type: ${data.channelType}, Name: ${data.channelName}, User: ${data.userId}`,
    );

    // Service-2 processes the channel registration and publishes a notification event for Service-3
    await this.simulateProcessing(150);

    // Create notification event for Service-3
    const notificationEvent = {
      eventId: `notification-${data.aggregateId}-${Date.now()}`,
      eventName: 'ChannelNotificationEvent',
      channelId: data.aggregateId,
      channelType: data.channelType,
      channelName: data.channelName,
      userId: data.userId,
      notificationType: 'CHANNEL_WELCOME',
      message: `Welcome! Your ${data.channelType} channel '${data.channelName}' has been successfully registered.`,
      occurredOn: new Date().toISOString(),
    };

    try {
      // Publish to service-3-events topic for Service-3 to consume
      await this.kafkaService.publishMessage(
        'service-3-events',
        notificationEvent,
      );
      this.logger.log(
        `📧 [Service-2] Published notification event for Service-3: ${notificationEvent.eventId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to publish notification event: ${error.message}`,
      );
      throw error;
    }
  }

  private async simulateProcessing(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetriableError(error: any): boolean {
    // Define which errors should be retried
    const retriableErrors = ['ECONNREFUSED', 'TIMEOUT', 'SERVICE_UNAVAILABLE'];

    return retriableErrors.some(
      (retriable) =>
        error.message?.includes(retriable) || error.code === retriable,
    );
  }
}
