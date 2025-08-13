import { Injectable, Logger } from '@nestjs/common';
import { KafkaTopicHandler, KafkaMessagePayload } from '@libs/nestjs-kafka';

@Injectable()
export class NotificationEventsHandler implements KafkaTopicHandler {
  private readonly logger = new Logger(NotificationEventsHandler.name);
  readonly topicName = 'notification-events';

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
        `📧 Processing notification event [${messageId}]: ${JSON.stringify(data)}.  `,
      );

      // Handle different notification actions
      switch (data.action) {
        case 'SEND_EMAIL':
          await this.handleSendEmail(data.payload);
          break;
        case 'SEND_SMS':
          await this.handleSendSMS(data.payload);
          break;
        case 'PUSH_NOTIFICATION':
          await this.handlePushNotification(data.payload);
          break;
        default:
          this.logger.warn(`❓ Unknown notification action: ${data.action}`);
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `✅ Notification event [${messageId}] processed successfully in ${processingTime}ms.  `,
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `❌ Error processing notification-events message [${messageId}] after ${processingTime}ms: ${error}.  `,
      );

      // Classify error for retry logic
      if (this.isRetriableError(error)) {
        this.logger.warn(
          `🔄 Retriable error, will retry message [${messageId}]: ${error}.  `,
        );
        throw error; // Re-throw for retry
      } else {
        this.logger.error(
          `🚫 Non-retriable error, skipping message [${messageId}]: ${error}.  `,
        );
        // Don't re-throw, message will be marked as processed
      }
    }
  }

  private async handleSendEmail(payload: any): Promise<void> {
    this.logger.log(
      `📬 Sending email to ${payload.to} - Subject: "${payload.subject}".  `,
    );

    // Simulate email sending
    await this.simulateProcessing(200);

    // Here you would typically:
    // - Validate email address
    // - Format email content
    // - Send via email service
    // - Log delivery status
  }

  private async handleSendSMS(payload: any): Promise<void> {
    this.logger.log(
      `📱 Sending SMS to ${payload.phoneNumber} - Message: "${payload.message?.substring(0, 50)}...".  `,
    );

    await this.simulateProcessing(150);

    // Handle SMS sending
  }

  private async handlePushNotification(payload: any): Promise<void> {
    this.logger.log(
      `🔔 Sending push notification to ${payload.deviceId} - Title: "${payload.title}".  `,
    );

    await this.simulateProcessing(100);

    // Handle push notification
  }

  private async simulateProcessing(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetriableError(error: any): boolean {
    // Define which errors should be retried
    const retriableErrors = [
      'ECONNREFUSED',
      'TIMEOUT',
      'SERVICE_UNAVAILABLE',
      'RATE_LIMITED',
    ];

    return retriableErrors.some(
      (retriable) =>
        error.message?.includes(retriable) || error.code === retriable,
    );
  }
}
