import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { KafkaPublisherService } from './kafka-publisher.service';
import { PublishEventDto } from './dto/publish-event.dto';

@ApiTags('Kafka')
@Controller('kafka')
export class KafkaController {
  constructor(private readonly kafkaService: KafkaPublisherService) {}


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
