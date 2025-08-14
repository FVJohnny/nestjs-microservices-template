import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { KafkaService } from './kafka-service';
import { PublishEventDto } from './dto/publish-event.dto';

@ApiTags('Kafka')
@Controller('kafka')
export class KafkaController {
  constructor(private readonly kafkaService: KafkaService) {}


  @Post('publish-event')
  @ApiOperation({ summary: 'Publish an event to Kafka' })
  @ApiQuery({ 
    name: 'topic', 
    description: 'Kafka topic to publish to',
    example: 'example-topic'
  })
  @ApiBody({ type: PublishEventDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Event published successfully' 
  })
  async publishEvent(@Query('topic') topic: string, @Body() event: PublishEventDto) {
    await this.kafkaService.publishMessage(topic, event);
    return { success: true, topic, message: 'Event published successfully' };
  }

  @Get('consumer-stats')
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
