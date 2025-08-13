import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import { CorrelationLogger } from '@libs/nestjs-common';
import { KafkaService } from '../../../../shared/messaging/kafka/kafka.service';

@ApiTags('testing')
@Controller('test')
export class TestKafkaController {
  private readonly logger = new CorrelationLogger(TestKafkaController.name);
  
  constructor(
    private readonly kafkaService: KafkaService,
  ) {}

  @Post('kafka/create-channel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Test Kafka channel creation',
    description: 'Sends a CREATE_CHANNEL message to Kafka to test the consumer',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        channelType: { type: 'string', example: 'telegram' },
        name: { type: 'string', example: 'Test Channel via Kafka' },
        userId: { type: 'string', example: 'user-123' },
        connectionConfig: { 
          type: 'object',
          example: { botToken: 'test-token' },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Message sent to Kafka' })
  async testCreateChannel(@Body() payload: any) {
    const message = {
      action: 'CREATE_CHANNEL',
      payload,
    };

    await this.kafkaService.getPublisher().publishMessage('trading-signals', message);
    
    this.logger.log(`Test message sent to Kafka: ${JSON.stringify(message)}`);
    return { success: true, message: 'Channel creation message sent to Kafka' };
  }

  @Post('kafka/process-signal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Test Kafka signal processing',
    description: 'Sends a PROCESS_SIGNAL message to Kafka to test the consumer',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        channelId: { type: 'string', example: 'channel-id-123' },
        signalType: { type: 'string', example: 'TRADING' },
        signalData: {
          type: 'object',
          properties: {
            symbol: { type: 'string', example: 'BTC/USD' },
            action: { type: 'string', enum: ['BUY', 'SELL', 'HOLD'], example: 'BUY' },
            price: { type: 'number', example: 45000 },
            stopLoss: { type: 'number', example: 43000 },
            takeProfit: { type: 'number', example: 50000 },
            confidence: { type: 'number', example: 85 },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Message sent to Kafka' })
  async testProcessSignal(@Body() payload: any) {
    if (!payload.signalData.timestamp) {
      payload.signalData.timestamp = new Date();
    }

    const message = {
      action: 'PROCESS_SIGNAL',
      payload,
    };

    await this.kafkaService.getPublisher().publishMessage('trading-signals', message);
    
    this.logger.log(`Test signal sent to Kafka: ${JSON.stringify(message)}`);
    return { success: true, message: 'Signal processing message sent to Kafka' };
  }

  @Get('kafka/consumer-stats')
  @ApiOperation({
    summary: 'Get Kafka consumer statistics with counters',
    description: 'Returns detailed statistics from the KafkaService including message counters, processing times, and per-topic metrics',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Consumer statistics with counters and metrics',
    schema: {
      type: 'object',
      properties: {
        consumerId: { type: 'string', example: 'service-1-consumer' },
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
    return this.kafkaService.getConsumerStats();
  }
}