import { Injectable, Logger } from "@nestjs/common";

import type { ParsedIntegrationMessage } from "../integration-events/types/integration-event.types";
import { DomainEvent } from "../general";

// Integration event stats
export interface EventStats {
  eventName: string;
  topic: string;
  successCount: number;
  failureCount: number;
  lastProcessed?: Date;
}

// Backward-compatible summary for integration events only
export interface AllEventsSummary {
  service: string;
  totalEventsProcessed: number;
  timestamp: string;
  eventsByType: EventStats[];
}

@Injectable()
export class EventTrackerService {
  private readonly logger = new Logger(EventTrackerService.name);

  private stats = new Map<string, EventStats>();

  static DomainEventTopic = "Domain Events";

  // ===== Integration Events =====
  trackEvent(
    topic: string,
    event: ParsedIntegrationMessage,
    success: boolean,
  ): void {
    const eventName = event.name || "Unknown";
    this.logger.debug(`Tracking event ${eventName} for topic ${topic}`);
    this.initializeStats(topic, eventName);

    const key = this.integrationKey(eventName, topic);
    const existing = this.stats.get(key);
    if (!existing) return;

    if (success) existing.successCount += 1;
    else existing.failureCount += 1;
    existing.lastProcessed = new Date();
  }

  trackDomainEvent(event: DomainEvent, success: boolean): void {
    const eventName = event.constructor.name || "Unknown";
    this.trackEvent(
      EventTrackerService.DomainEventTopic,
      {
        id: event.metadata.id,
        name: eventName,
      },
      success,
    );
  }

  initializeStats(topic: string, eventName: string): void {
    this.logger.debug(
      `Initializing stats for topic '${topic}' and event '${eventName}'`,
    );
    const key = this.integrationKey(eventName, topic);
    if (!this.stats.has(key)) {
      this.stats.set(key, {
        eventName,
        topic,
        successCount: 0,
        failureCount: 0,
        lastProcessed: undefined,
      });
    }
  }

  getStats(): AllEventsSummary {
    const eventsByType = Array.from(this.stats.values());
    const totalEventsProcessed = eventsByType.reduce(
      (sum, s) => sum + s.successCount + s.failureCount,
      0,
    );
    return {
      service: process.env.SERVICE_NAME || "unknown",
      totalEventsProcessed,
      timestamp: new Date().toISOString(),
      eventsByType: eventsByType.sort((a, b) =>
        a.eventName.localeCompare(b.eventName),
      ),
    };
  }

  // Helpers
  private integrationKey(eventName: string, topic: string): string {
    return `${topic}:${eventName}`;
  }
}
