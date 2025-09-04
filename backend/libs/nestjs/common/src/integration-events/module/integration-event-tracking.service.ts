import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';

import { BaseIntegrationEvent } from '../events';
import { EventTrackerService } from './event-tracker.service';

@Injectable()
export class IntegrationEventTrackingService implements OnModuleInit {
  private readonly logger = new Logger(IntegrationEventTrackingService.name);
  private originalMethods = new Map<string, Function>();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly eventTracker: EventTrackerService
  ) {}

  async onModuleInit() {
    this.wrapIntegrationEventHandlers();
  }

  private wrapIntegrationEventHandlers() {
    // Find all providers that have integration event handlers
    const providers = this.discoveryService.getProviders();
    
    providers.forEach(wrapper => {
      if (!wrapper.instance) return;
      
      const instance = wrapper.instance;
      
      // Check if this has a handleEvent method (integration event handler pattern)
      if (typeof instance.handleEvent === 'function') {
        const originalMethod = instance.handleEvent.bind(instance);
        const className = instance.constructor.name;
        
        this.originalMethods.set(className, originalMethod);
        
        // Wrap the handleEvent method with tracking
        instance.handleEvent = async (event: BaseIntegrationEvent, messageId: string) => {
          try {
            // Track the event automatically
            this.eventTracker.trackEvent(event);
            
            this.logger.debug(`Auto-tracked integration event: ${event.name} from ${className}`);
            
            // Call the original handler
            return await originalMethod(event, messageId);
            
          } catch (error) {
            this.logger.error(`Error in tracked event handler ${className}:`, error);
            throw error;
          }
        };
        
        this.logger.log(`Wrapped integration event handler: ${className}`);
      }
    });
  }
}