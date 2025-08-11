import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { KafkaService } from './kafka.service';
import { PublishEventDto } from './dto/publish-event.dto';

@ApiTags('Kafka')
@Controller('kafka')
export class KafkaController {
  constructor(private readonly kafkaService: KafkaService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get Kafka service statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns service statistics including events processed',
    schema: {
      type: 'object',
      properties: {
        service: { type: 'string', example: 'service-1' },
        eventsProcessed: { type: 'number', example: 42 },
        timestamp: { type: 'string', example: '2025-08-11T16:20:33.123Z' }
      }
    }
  })
  getStats() {
    return this.kafkaService.getStats();
  }

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
}
