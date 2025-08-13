import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import { KafkaService } from '@libs/nestjs-kafka';
import { Service2KafkaConsumerService } from '../../../shared/messaging/kafka/service-2-kafka-consumer.service';

@ApiTags('testing')
@Controller('test')
export class TestKafkaController {
  
  constructor(
    private readonly kafkaService: KafkaService,
    private readonly kafkaConsumerService: Service2KafkaConsumerService,
  ) {}

  @Post('kafka/create-order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Test Kafka order creation',
    description: 'Sends a CREATE_ORDER message to Kafka to test the consumer',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: 'user-123' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string', example: 'product-456' },
              quantity: { type: 'number', example: 2 },
              price: { type: 'number', example: 29.99 }
            }
          }
        },
        shippingAddress: { 
          type: 'object',
          properties: {
            street: { type: 'string', example: '123 Main St' },
            city: { type: 'string', example: 'San Francisco' },
            state: { type: 'string', example: 'CA' },
            zip: { type: 'string', example: '94105' }
          }
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Message sent to Kafka' })
  async testCreateOrder(@Body() payload: any) {
    const message = {
      action: 'CREATE_ORDER',
      payload,
    };

    await this.kafkaService.publishMessage('order-events', message);
    
    return { success: true, message: 'Order creation message sent to Kafka' };
  }

  @Post('kafka/send-notification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Test Kafka notification sending',
    description: 'Sends a notification message to Kafka to test the consumer',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['EMAIL', 'SMS', 'PUSH'], example: 'EMAIL' },
        to: { type: 'string', example: 'user@example.com' },
        subject: { type: 'string', example: 'Order Confirmation' },
        message: { type: 'string', example: 'Your order has been confirmed!' },
        phoneNumber: { type: 'string', example: '+1234567890' },
        deviceId: { type: 'string', example: 'device-token-abc123' },
        title: { type: 'string', example: 'New Message' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Message sent to Kafka' })
  async testSendNotification(@Body() payload: any) {
    let action = 'SEND_EMAIL';
    
    switch (payload.type) {
      case 'SMS':
        action = 'SEND_SMS';
        break;
      case 'PUSH':
        action = 'PUSH_NOTIFICATION';
        break;
      default:
        action = 'SEND_EMAIL';
    }

    const message = {
      action,
      payload,
    };

    await this.kafkaService.publishMessage('notification-events', message);
    
    return { success: true, message: 'Notification message sent to Kafka' };
  }

  @Get('kafka/consumer-stats')
  @ApiOperation({
    summary: 'Get Kafka consumer statistics with counters',
    description: 'Returns detailed statistics from the Service2KafkaConsumerService including message counters, processing times, and per-topic metrics',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Consumer statistics with counters and metrics',
    schema: {
      type: 'object',
      properties: {
        consumerId: { type: 'string', example: 'service-2-consumer' },
        handlerCount: { type: 'number', example: 2 },
        totalMessages: { type: 'number', example: 42 },
        totalSuccesses: { type: 'number', example: 40 },
        totalFailures: { type: 'number', example: 2 },
        uptime: { type: 'number', example: 300000 },
        startedAt: { type: 'string', format: 'date-time' },
        topics: { type: 'array', items: { type: 'string' } },
        handlers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              handlerName: { type: 'string' },
              messagesProcessed: { type: 'number' },
              messagesSucceeded: { type: 'number' },
              messagesFailed: { type: 'number' },
              totalProcessingTime: { type: 'number' },
              averageProcessingTime: { type: 'number' },
              lastProcessedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  getConsumerStats() {
    return this.kafkaConsumerService.getStats();
  }
}