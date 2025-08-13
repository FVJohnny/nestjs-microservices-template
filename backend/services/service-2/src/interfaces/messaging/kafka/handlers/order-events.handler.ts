import { Injectable, Logger } from '@nestjs/common';
import { KafkaTopicHandler, KafkaMessagePayload } from '@libs/nestjs-kafka';

@Injectable()
export class OrderEventsHandler implements KafkaTopicHandler {
  private readonly logger = new Logger(OrderEventsHandler.name);
  readonly topicName = 'order-events';

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

      this.logger.debug(`🛒 Processing order event [${messageId}]: ${JSON.stringify(data)}.  `);

      // Handle different order actions
      switch (data.action) {
        case 'CREATE_ORDER':
          await this.handleCreateOrder(data.payload);
          break;
        case 'UPDATE_ORDER':
          await this.handleUpdateOrder(data.payload);
          break;
        case 'CANCEL_ORDER':
          await this.handleCancelOrder(data.payload);
          break;
        default:
          this.logger.warn(`❓ Unknown order action: ${data.action}`);
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(`✅ Order event [${messageId}] processed successfully in ${processingTime}ms.  `);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ Error processing order-events message [${messageId}] after ${processingTime}ms: ${error}.  `);

      // Classify error for retry logic
      if (this.isRetriableError(error)) {
        this.logger.warn(`🔄 Retriable error, will retry message [${messageId}]: ${error}.  `);
        throw error; // Re-throw for retry
      } else {
        this.logger.error(`🚫 Non-retriable error, skipping message [${messageId}]: ${error}.  `);
        // Don't re-throw, message will be marked as processed
      }
    }
  }

  private async handleCreateOrder(payload: any): Promise<void> {
    this.logger.log(`📝 Creating order - User: ${payload.userId}, Items: ${payload.items?.length || 0}.  `);
    
    // Simulate order processing
    await this.simulateProcessing(100);
    
    // Here you would typically:
    // - Validate order data
    // - Check inventory
    // - Calculate totals
    // - Save to database
    // - Send confirmation events
  }

  private async handleUpdateOrder(payload: any): Promise<void> {
    this.logger.log(`✏️  Updating order ${payload.orderId} - Status: ${payload.status}.  `);
    
    await this.simulateProcessing(50);
    
    // Handle order updates
  }

  private async handleCancelOrder(payload: any): Promise<void> {
    this.logger.log(`❌ Canceling order ${payload.orderId}.  `);
    
    await this.simulateProcessing(30);
    
    // Handle order cancellation
  }

  private async simulateProcessing(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isRetriableError(error: any): boolean {
    // Define which errors should be retried
    const retriableErrors = [
      'ECONNREFUSED',
      'TIMEOUT',
      'SERVICE_UNAVAILABLE'
    ];
    
    return retriableErrors.some(retriable => 
      error.message?.includes(retriable) || error.code === retriable
    );
  }
}