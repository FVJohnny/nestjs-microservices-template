import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { EventTrackerService } from './event-tracker.service';

/**
 * Generic messaging controller that works with any event source implementation
 * (Kafka, Redis, RabbitMQ, etc.) through dependency injection
 */
@ApiTags('Event-Tracker')
@Controller('event-tracker')
export class EventTrackerController {
  constructor(
    private readonly eventTracker: EventTrackerService,
  ) {}

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get event tracker statistics',
    description: 'Returns statistics about integration events and domain events' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Event tracker statistics',
    schema: {
      type: 'object',
      properties: {
        service: { type: 'string', example: 'Copy Signals AI' },
        totalEventsProcessed: { type: 'number', example: 123 },
        eventsByType: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              eventName: { type: 'string', example: 'channel.create' },
              topic: { type: 'string', example: 'trading-signals' },
              successCount: { type: 'number', example: 123 },
              failureCount: { type: 'number', example: 0 },
              lastProcessed: { type: 'string', format: 'date-time', example: '2023-04-01T12:34:56.789Z' },
            },
          },
        },
        timestamp: { type: 'string', format: 'date-time', example: '2023-04-01T12:34:56.789Z' },
      },
    },
  })
  async getListenerStats() {
    const trackingStats = this.eventTracker.getStats();
    
    return {
      service: trackingStats.service,
      totalEventsProcessed: trackingStats.totalEventsProcessed,
      eventsByType: trackingStats.eventsByType,
      timestamp: trackingStats.timestamp,
    };
  }

}
