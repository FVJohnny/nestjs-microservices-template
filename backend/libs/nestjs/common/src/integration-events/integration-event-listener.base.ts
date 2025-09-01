import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { IIntegrationEventHandler } from './integration-event-handler.base';
import { EventTrackerService } from './event-tracker.service';

interface HandlerInfo {
  handler: IIntegrationEventHandler;
  eventType: string;
  handlerName: string;
}

/**
 * Abstract base class for EventListener implementations
 * Provides common functionality for managing event handlers and listening state
 */
@Injectable()
export abstract class BaseIntegrationEventListener implements IntegrationEventListener, OnModuleInit, OnModuleDestroy {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly eventHandlers = new Map<string, HandlerInfo[]>(); // topic -> array of handlers
  protected readonly messageStats = new Map<string, {
    messagesProcessed: number;
    messagesSucceeded: number;
    messagesFailed: number;
    totalProcessingTime: number;
    lastProcessedAt: Date | null;
  }>();
  protected isListeningFlag = false;

  constructor() {}

  async onModuleInit() {
    // Subclasses can override this for initialization
  }

  async onModuleDestroy() {
    if (this.isListeningFlag) {
      await this.stopListening();
    }
  }

  async startListening(): Promise<void> {
    if (this.isListeningFlag) {
      this.logger.warn(`${this.constructor.name} is already listening`);
      return;
    }

    this.isListeningFlag = true;

    // Topics are already subscribed when handlers are registered
    // No need to subscribe again here

    this.logger.log(`${this.constructor.name} started listening`);
  }

  async stopListening(): Promise<void> {
    if (!this.isListeningFlag) {
      this.logger.warn(`${this.constructor.name} is not currently listening`);
      return;
    }

    this.isListeningFlag = false;

    // Unsubscribe from all topics
    for (const topicName of this.eventHandlers.keys()) {
      await this.unsubscribeFromTopic(topicName);
    }

    this.logger.log(`${this.constructor.name} stopped listening`);
  }

  isListening(): boolean {
    return this.isListeningFlag;
  }

  async registerEventHandler(topicName: string, handler: IIntegrationEventHandler): Promise<void> {
    // Extract event type from handler's event class
    let eventType = 'Unknown';
    try {
      const eventClass = (handler as any).eventClass;
      if (eventClass) {
        try {
          let tempInstance;
          try {
            tempInstance = new eventClass({});
          } catch {
            tempInstance = new eventClass({}, new Date());
          }
          eventType = tempInstance.name;
        } catch {
          this.logger.warn(`Could not extract event type for handler ${handler.constructor.name}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to extract event type: ${error}`);
    }

    // Get existing handlers for this topic or create new array
    let topicHandlers = this.eventHandlers.get(topicName);
    if (!topicHandlers) {
      topicHandlers = [];
      this.eventHandlers.set(topicName, topicHandlers);
    }

    // Check if handler for this specific event type already exists
    const existingHandler = topicHandlers.find(info => info.eventType === eventType);
    if (existingHandler) {
      this.logger.warn(
        `Tried to register handler '${handler.constructor.name}' for event type '${eventType}' on topic '${topicName}' ` +
        `but it already exists on handler '${existingHandler.handlerName}'`
      );
      return;
    }

    // Add handler to the topic's handler list
    topicHandlers.push({
      handler,
      eventType,
      handlerName: handler.constructor.name
    });

    // Initialize message stats for this topic if not exists
    if (!this.messageStats.has(topicName)) {
      this.messageStats.set(topicName, {
        messagesProcessed: 0,
        messagesSucceeded: 0,
        messagesFailed: 0,
        totalProcessingTime: 0,
        lastProcessedAt: null,
      });
    }

    // Pre-register the event in the tracker with 0 count only when a handler exists
    try {
      const eventTracker = EventTrackerService.getInstance();
      if (eventTracker) {
        this.logger.log(`Pre-registering event: ${eventType} for topic: ${topicName} (handler exists)`);
        eventTracker.preRegisterEvent(eventType, topicName);
      }
    } catch (trackingError) {
      this.logger.error(`Pre-registration failed: ${trackingError}`);
    }

    // Subscribe to topic if this is the first handler for this topic
    if (topicHandlers.length === 1) {
      await this.subscribeToTopic(topicName);
    }

    this.logger.log(`Registered event handler '${handler.constructor.name}' for event type '${eventType}' on topic '${topicName}' (${topicHandlers.length} handlers total)`);
  }

  /**
   * Handle incoming messages from the event source
   * Parses the message and delegates to the appropriate event handler
   */
  protected async handleMessage(topicName: string, rawMessage: any): Promise<void> {
    const startTime = Date.now();
    const stats = this.messageStats.get(topicName);
    
    try {
      const { parsedMessage, messageId } = this.parseMessage(rawMessage);

      // Find the appropriate event handler based on event type
      const topicHandlers = this.eventHandlers.get(topicName);

      if (!topicHandlers || topicHandlers.length === 0) {
        this.logger.debug(`No handlers registered for topic '${topicName}', skipping message [${messageId}]`);
        return;
      }

      const eventType = parsedMessage.name || 'Unknown';
      const handlerInfo = topicHandlers.find(info => info.eventType === eventType);

      if (!handlerInfo) {
        this.logger.debug(`No handler registered for event type '${eventType}' on topic '${topicName}', skipping message [${messageId}]`);
        this.logger.debug(`Available handlers for topic: ${topicHandlers.map(h => h.eventType).join(', ')}`);
        return;
      }

      // Track the event ONLY if we have a handler for it
      try {
        const eventTracker = EventTrackerService.getInstance();
        if (eventTracker && parsedMessage) {
          // Create a mock event object for tracking
          const mockEvent = {
            name: parsedMessage.name || 'Unknown',
            topic: parsedMessage.topic || topicName,
          };
          eventTracker.trackEvent(mockEvent as any);
          this.logger.debug(`Tracked handled event: ${mockEvent.name} from topic: ${mockEvent.topic}`);
        }
      } catch (trackingError) {
        this.logger.warn(`Failed to track event: ${trackingError}`);
      }

      // Update message stats - increment processed count
      if (stats) {
        stats.messagesProcessed++;
        stats.lastProcessedAt = new Date();
      }

      // Delegate to the appropriate event handler
      await handlerInfo.handler.handle(parsedMessage, messageId);
      
      // Update success stats
      if (stats) {
        stats.messagesSucceeded++;
        stats.totalProcessingTime += Date.now() - startTime;
      }
      
    } catch (error) {
      // Update failure stats
      if (stats) {
        stats.messagesFailed++;
        stats.totalProcessingTime += Date.now() - startTime;
      }
      
      this.logger.error(`Error handling message for topic '${topicName}': ${error}`);
      throw error;
    }
  }

  /**
   * Get message statistics for all topics
   */
  getMessageStats() {
    const stats = [];
    for (const [topicName, handler] of this.eventHandlers.entries()) {
      const messageStats = this.messageStats.get(topicName);
      if (messageStats) {
        stats.push({
          topic: topicName,
          handlerName: handler.constructor.name,
          messagesProcessed: messageStats.messagesProcessed,
          messagesSucceeded: messageStats.messagesSucceeded,
          messagesFailed: messageStats.messagesFailed,
          averageProcessingTime: messageStats.messagesProcessed > 0 
            ? Math.round(messageStats.totalProcessingTime / messageStats.messagesProcessed)
            : 0,
          lastProcessedAt: messageStats.lastProcessedAt,
        });
      }
    }
    return stats;
  }

  /**
   * Get total message statistics across all topics
   */
  getTotalMessageStats() {
    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;
    let totalProcessingTime = 0;

    for (const stats of this.messageStats.values()) {
      totalProcessed += stats.messagesProcessed;
      totalSucceeded += stats.messagesSucceeded;
      totalFailed += stats.messagesFailed;
      totalProcessingTime += stats.totalProcessingTime;
    }

    return {
      totalMessages: totalProcessed,
      totalSuccesses: totalSucceeded,
      totalFailures: totalFailed,
      averageProcessingTime: totalProcessed > 0 
        ? Math.round(totalProcessingTime / totalProcessed)
        : 0,
    };
  }

  /**
   * Abstract methods that subclasses must implement
   */
  protected abstract subscribeToTopic(topicName: string): Promise<void>;
  protected abstract unsubscribeFromTopic(topicName: string): Promise<void>;
  protected abstract parseMessage(rawMessage: any): { parsedMessage: Record<string, unknown>; messageId: string };
}

export const INTEGRATION_EVENT_LISTENER_TOKEN = 'IntegrationEventListener';
export interface IntegrationEventListener {
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  isListening(): boolean;
  registerEventHandler(topicName: string, handler: IIntegrationEventHandler): Promise<void>;
}