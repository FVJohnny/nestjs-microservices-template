import { Body, Controller, Get, Inject,Post } from '@nestjs/common';
import { ApiBody,ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { INTEGRATION_EVENT_PUBLISHER_TOKEN, IntegrationEventPublisher } from './event-publisher.interface';
import { EventTrackerService } from './event-tracker.service';
import { INTEGRATION_EVENT_LISTENER_TOKEN, IntegrationEventListener } from './integration-event-listener.base';

/**
 * Generic messaging controller that works with any event source implementation
 * (Kafka, Redis, RabbitMQ, etc.) through dependency injection
 */
@ApiTags('Integration-Events')
@Controller('integration-events')
export class MessagingController {
  constructor(
    @Inject(INTEGRATION_EVENT_PUBLISHER_TOKEN)
    private readonly integrationEventPublisher: IntegrationEventPublisher,
    @Inject(INTEGRATION_EVENT_LISTENER_TOKEN)
    private readonly integrationEventListener: IntegrationEventListener,
  ) {}

  @Post('publish')
  @ApiOperation({ 
    summary: 'Publish an integration event.',
    description: 'Publishes an integration event to the configured messaging backend (Kafka, Redis, etc.)' 
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        topic: { 
          type: 'string', 
          example: 'trading-signals',
          description: 'The topic/channel to publish to' 
        },
        message: { 
          type: 'object',
          example: {
            name: 'channel.create',
            channelType: 'telegram',
            userId: 'user123',
            connectionConfig: {}
          },
          description: 'The event message payload' 
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
        message: { type: 'string', example: 'Integration event published successfully' },
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
        error: { type: 'string', example: 'Failed to publish Integration Event' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async publishEvent(
    @Body() body: { 
      topic: string; 
      message: unknown;
    }
  ) {
    try {
      await this.integrationEventPublisher.publish(body.topic, JSON.stringify(body.message));
      
      // Get backend type from the implementation class name
      const backend = this.integrationEventPublisher.constructor.name.replace('IntegrationEventPublisher', '');
      
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

  @Get('listener/status')
  @ApiOperation({ 
    summary: 'Get event listener status',
    description: 'Returns the current status of the event listener' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Event listener status',
    schema: {
      type: 'object',
      properties: {
        listening: { type: 'boolean', example: true },
        backend: { type: 'string', example: 'RedisEventListener' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getListenerStatus() {
    const backend = this.integrationEventListener.constructor.name;
    
    return {
      backend,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('listener/stats')
  @ApiOperation({ 
    summary: 'Get event listener statistics',
    description: 'Returns statistics about subscribed topics and handlers' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Event listener statistics',
    schema: {
      type: 'object',
      properties: {
        listening: { type: 'boolean', example: true },
        backend: { type: 'string', example: 'RedisEventListener' },
        subscribedTopics: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['trading-signals', 'channels'] 
        },
        handlerCount: { type: 'number', example: 2 },
        handlers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              topic: { type: 'string', example: 'trading-signals' },
              handlerName: { type: 'string', example: 'TradingSignalsIntegrationEventHandler' },
              messagesProcessed: { type: 'number', example: 42 },
              messagesSucceeded: { type: 'number', example: 40 },
              messagesFailed: { type: 'number', example: 2 },
              averageProcessingTime: { type: 'number', example: 150 },
              lastProcessedAt: { type: 'string', format: 'date-time' },
            }
          }
        },
        totalStats: {
          type: 'object',
          properties: {
            totalMessages: { type: 'number', example: 42 },
            totalSuccesses: { type: 'number', example: 40 },
            totalFailures: { type: 'number', example: 2 },
            averageProcessingTime: { type: 'number', example: 150 },
          }
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getListenerStats() {
    const backend = this.integrationEventListener.constructor.name.replace('IntegrationEventListener', '');
    
    // Get new event tracking stats using singleton
    const trackingStats = EventTrackerService.getInstance().getStats();
    
    // Use the tracked events directly - EventTrackerService already includes all events with 0 counts
    const allEventsByType = [...trackingStats.eventsByType];

    // Return only the new event tracking format - no legacy merging
    return {
      // New event tracking format
      service: trackingStats.service,
      totalEventsProcessed: trackingStats.totalEventsProcessed,
      eventsByType: allEventsByType.sort((a, b) => b.count - a.count),
      timestamp: trackingStats.timestamp,
    };
  }

  @Post('listener/reset-tracker')
  @ApiOperation({ 
    summary: 'Reset event tracker (debug only)',
    description: 'Resets the event tracker to clear all counts' 
  })
  async resetTracker() {
    try {
      const eventTracker = EventTrackerService.getInstance();
      eventTracker.reset();
      return {
        success: true,
        message: 'Event tracker reset',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset tracker',
        timestamp: new Date().toISOString(),
      };
    }
  }
}