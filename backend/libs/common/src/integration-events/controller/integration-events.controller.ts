import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { INTEGRATION_EVENT_PUBLISHER } from '../publisher/event-publisher.interface';
import type { IntegrationEventPublisher } from '../publisher/event-publisher.interface';
import { TracingService } from '../../tracing';
import { Id } from '../../general';

/**
 * Generic messaging controller that works with any event source implementation
 * (Kafka, Redis, RabbitMQ, etc.) through dependency injection
 */
@ApiTags('Integration-Events')
@Controller('integration-events')
export class IntegrationEventsController {
  constructor(
    @Inject(INTEGRATION_EVENT_PUBLISHER)
    private readonly integrationEventPublisher: IntegrationEventPublisher,
  ) {}

  @Post('publish')
  @ApiOperation({
    summary: 'Publish an integration event.',
    description:
      'Publishes an integration event to the configured messaging backend (Kafka, Redis, etc.)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          example: 'trading-signals',
          description: 'The topic/channel to publish to',
        },
        message: {
          type: 'object',
          example: {
            name: 'channel.create',
            channelType: 'telegram',
            userId: 'user123',
            connectionConfig: {},
          },
          description: 'The event message payload',
        },
      },
      required: ['topic', 'message'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Integration event published successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        topic: { type: 'string', example: 'trading-signals' },
        message: {
          type: 'object',
          example: 'Integration event published successfully',
        },
        backend: { type: 'string', example: 'Redis' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to publish Integration Event',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'string',
          example: 'Failed to publish Integration Event',
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async publishEvent(@Body() body: { topic: string; message: object }) {
    try {
      const metadata = TracingService.getTracingMetadata();
      const message = {
        ...body.message,
        id: Id.random().toValue(),
        metadata,
      };
      await this.integrationEventPublisher.publish(body.topic, JSON.stringify(message));

      // Get backend type from the implementation class name
      const backend = this.integrationEventPublisher.constructor.name.replace(
        'IntegrationEventPublisher',
        '',
      );

      return {
        success: true,
        topic: body.topic,
        message: 'Integration Event published successfully',
        backend,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish event',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
