import { Controller, Post, Get, Body, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { IntegrationEventPublisher } from './event-publisher.interface';
import { BaseIntegrationEventListener, IntegrationEventListener } from './base.integration-event-listener';
import { INTEGRATION_EVENT_LISTENER_TOKEN, INTEGRATION_EVENT_PUBLISHER_TOKEN } from '.';

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
            eventName: 'channel.create',
            channelType: 'telegram',
            name: 'Test Channel',
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
      message: any;
    }
  ) {
    try {
      await this.integrationEventPublisher.publish(body.topic, body.message);
      
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
    const isListening = this.integrationEventListener.isListening();
    const backend = this.integrationEventListener.constructor.name;
    
    return {
      listening: isListening,
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
    const isListening = this.integrationEventListener.isListening();
    const backend = this.integrationEventListener.constructor.name.replace('IntegrationEventListener', '');
    
    // Try to get detailed stats if the listener is a BaseEventListener
    let subscribedTopics: string[] = [];
    let handlers: any[] = [];
    let totalStats: any = {};
    
    if (this.integrationEventListener instanceof BaseIntegrationEventListener) {
      const baseListener = this.integrationEventListener as any; // Access protected members
      if (baseListener.eventHandlers) {
        subscribedTopics = Array.from(baseListener.eventHandlers.keys());
        
        // Get detailed message statistics for each handler
        if (typeof baseListener.getMessageStats === 'function') {
          handlers = baseListener.getMessageStats();
        } else {
          // Fallback to basic handler info without stats
          handlers = Array.from(baseListener.eventHandlers.entries()).map((entry: any) => {
            const [topic, handler] = entry;
            return {
              topic,
              handlerName: handler.constructor.name,
              messagesProcessed: 0,
              messagesSucceeded: 0,
              messagesFailed: 0,
              averageProcessingTime: 0,
              lastProcessedAt: null,
            };
          });
        }
        
        // Get total statistics across all handlers
        if (typeof baseListener.getTotalMessageStats === 'function') {
          totalStats = baseListener.getTotalMessageStats();
        } else {
          totalStats = {
            totalMessages: 0,
            totalSuccesses: 0,
            totalFailures: 0,
            averageProcessingTime: 0,
          };
        }
      }
    }
    
    return {
      listening: isListening,
      backend,
      subscribedTopics,
      handlerCount: subscribedTopics.length,
      handlers,
      totalStats,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('listener/start')
  @ApiOperation({ 
    summary: 'Start the event listener',
    description: 'Starts listening for events on all registered topics' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Listener started successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Event listener started' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async startListener() {
    try {
      await this.integrationEventListener.startListening();
      return {
        success: true,
        message: 'Event listener started',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start listener',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('listener/stop')
  @ApiOperation({ 
    summary: 'Stop the event listener',
    description: 'Stops listening for events on all topics' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Listener stopped successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Event listener stopped' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async stopListener() {
    try {
      await this.integrationEventListener.stopListening();
      return {
        success: true,
        message: 'Event listener stopped',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop listener',
        timestamp: new Date().toISOString(),
      };
    }
  }
}