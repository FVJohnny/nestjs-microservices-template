import { Injectable, Logger } from '@nestjs/common';

import { ParsedIntegrationMessage } from '../types/integration-event.types';

export interface EventStats {
  eventName: string;
  topic: string;
  successCount: number;
  failureCount: number;
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
  private stats = new Map<string, EventStats>();
  private readonly logger = new Logger(EventTrackerService.name);

  trackEvent(topic: string, event: ParsedIntegrationMessage, success: boolean): void {
    const eventName = event.name;
    
    this.logger.debug(`Tracking event ${eventName} for topic ${topic}`);
    
    this.initializeStats(eventName, topic);

    const key = this.key(eventName, topic);
    const existingStats = this.stats.get(key);
    if (!existingStats) {
      this.logger.debug(`No stats found for event ${key}`);
      return;
    }
    
    if (success) {
      existingStats.successCount += 1;
    } else {
      existingStats.failureCount += 1;
    }
    existingStats.lastProcessed = new Date();
    this.logger.debug(`Updated stats for event ${key}`);
  }

  getStats(): EventSummary {
    const eventsByType = Array.from(this.stats.values());
    const totalEventsProcessed = eventsByType.reduce((sum, stats) => sum + stats.successCount + stats.failureCount, 0);

    return {
      service: process.env.SERVICE_NAME || 'unknown',
      totalEventsProcessed,
      timestamp: new Date().toISOString(),
      eventsByType: eventsByType.sort((a, b) => a.eventName.localeCompare(b.eventName)),
    };
  }

  initializeStats(eventName: string, topic: string): void {
    const key = this.key(eventName, topic);
    if (this.stats.has(key)) {
      return;
    }
    this.stats.set(key, {
      eventName,
      topic,
      successCount: 0,
      failureCount: 0,
      lastProcessed: undefined,
    });
    this.logger.debug(`Initialized stats for event ${key}`);
  }

  private key(eventName: string, topic: string): string {
    return `${topic} - ${eventName}`;
  }

}