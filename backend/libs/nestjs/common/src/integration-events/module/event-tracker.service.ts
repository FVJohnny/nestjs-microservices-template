import { Injectable, Logger } from '@nestjs/common';

import { BaseIntegrationEvent } from '../events/base-integration-event';

export interface EventStats {
  eventType: string;
  topic: string;
  count: number;
  lastProcessed?: Date;
}

export interface EventSummary {
  service: string;
  totalEventsProcessed: number;
  timestamp: string;
  eventsByType: EventStats[];
}

@Injectable()
export class EventTrackerService {
  private static instance: EventTrackerService;
  private static isCreating = false;
  private eventCounts = new Map<string, EventStats>();
  private operationInProgress = false;
  private readonly logger = new Logger(EventTrackerService.name);

  constructor() {
    if (!EventTrackerService.isCreating) {
      EventTrackerService.instance = this;
    }
  }

  static getInstance(): EventTrackerService {
    if (!EventTrackerService.instance && !EventTrackerService.isCreating) {
      EventTrackerService.isCreating = true;
      EventTrackerService.instance = new EventTrackerService();
      EventTrackerService.isCreating = false;
    }
    return EventTrackerService.instance || new EventTrackerService();
  }

  trackEvent(event: BaseIntegrationEvent): void {
    // Prevent concurrent access issues
    if (this.operationInProgress) return;
    
    try {
      this.operationInProgress = true;
      const eventType = event.name;
      const topic = event.topic;
      
      this.logger.debug(`Tracking event ${eventType} for topic ${topic}`);

      const key = `${eventType}@${topic}`;
      const existingStats = this.eventCounts.get(key);

      if (existingStats) {
        existingStats.count += 1;
        existingStats.lastProcessed = new Date();
      } else {
        // Create new entry for this event
        this.eventCounts.set(key, {
          eventType,
          topic,
          count: 1,
          lastProcessed: new Date(),
        });
      }
    } finally {
      this.operationInProgress = false;
    }
  }

  getStats(): EventSummary {
    // Prevent concurrent access issues
    if (this.operationInProgress) {
      // Return empty stats if operation in progress to avoid blocking
      return {
        service: process.env.SERVICE_NAME || 'unknown',
        totalEventsProcessed: 0,
        timestamp: new Date().toISOString(),
        eventsByType: [],
      };
    }

    try {
      this.operationInProgress = true;
      const eventsByType = Array.from(this.eventCounts.values());
      const totalEventsProcessed = eventsByType.reduce((sum, stats) => sum + stats.count, 0);

      return {
        service: process.env.SERVICE_NAME || 'unknown',
        totalEventsProcessed,
        timestamp: new Date().toISOString(),
        eventsByType: eventsByType.sort((a, b) => b.count - a.count),
      };
    } finally {
      this.operationInProgress = false;
    }
  }

  reset(): void {
    if (this.operationInProgress) return;
    
    try {
      this.operationInProgress = true;
      this.eventCounts.clear();
      console.log('EventTrackerService: Cleared all event counts');
    } finally {
      this.operationInProgress = false;
    }
  }

  preRegisterEvent(name: string, topic: string): void {
    if (this.operationInProgress) return;
    
    try {
      this.operationInProgress = true;
      const key = `${name}@${topic}`;
      
      // Only add if it doesn't already exist
      if (!this.eventCounts.has(key)) {
        this.eventCounts.set(key, {
          eventType: name,
          topic,
          count: 0,
          lastProcessed: undefined,
        });
        this.logger.debug(`Pre-registered event ${name}@${topic}`);
      }
    } finally {
      this.operationInProgress = false;
    }
  }

}