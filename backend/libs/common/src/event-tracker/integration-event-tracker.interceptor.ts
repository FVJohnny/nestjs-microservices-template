import { Injectable, Inject } from '@nestjs/common';
import { EventTrackerService } from './event-tracker.service';
import {
  INTEGRATION_EVENT_LISTENER_TOKEN,
  type IntegrationEventListener,
} from '../integration-events/module/integration-event-listener.base';
import type { IIntegrationEventHandler } from '../integration-events/module/integration-event-handler.base';
import type { ParsedIntegrationMessage } from '../integration-events/types/integration-event.types';
import { CorrelationLogger } from '../logger';

/**
 * Universal Integration Event Tracker that intercepts Integration Event Listener methods
 */
@Injectable()
export class IntegrationEventTrackerInterceptor {
  private readonly logger = new CorrelationLogger(IntegrationEventTrackerInterceptor.name);

  constructor(
    private readonly eventTracker: EventTrackerService,
    @Inject(INTEGRATION_EVENT_LISTENER_TOKEN)
    private readonly integrationEventListener: IntegrationEventListener,
  ) {
    this.wrapIntegrationEventListener();
  }

  /**
   * Wraps the integration event listener methods to add tracking
   */
  private wrapIntegrationEventListener(): void {
    const listener = this.integrationEventListener as IntegrationEventListener & {
      registerEventHandler: (topicName: string, handler: IIntegrationEventHandler) => Promise<void>;
      handleMessage: (topicName: string, message: ParsedIntegrationMessage) => Promise<void>;
    };

    // Store original methods
    const originalRegisterEventHandler = listener.registerEventHandler.bind(listener);
    const originalHandleMessage = listener.handleMessage.bind(listener);

    // Wrap registerEventHandler
    listener.registerEventHandler = async (
      topicName: string,
      handler: IIntegrationEventHandler,
    ) => {
      await originalRegisterEventHandler(topicName, handler);

      // Extract event name for tracking initialization
      const eventName = this.extractEventName(handler);
      if (eventName) {
        this.eventTracker.initializeStats(topicName, eventName);
      }
    };

    // Wrap handleMessage
    listener.handleMessage = async (topicName: string, message: ParsedIntegrationMessage) => {
      try {
        await originalHandleMessage(topicName, message);
        this.eventTracker.trackEvent(topicName, message, true);
      } catch (error) {
        this.eventTracker.trackEvent(topicName, message, false);
        throw error;
      }
    };
  }

  private extractEventName(handler: IIntegrationEventHandler): string | null {
    try {
      const eventClass = (
        handler as IIntegrationEventHandler & {
          eventClass?: { fromJSON: (json: unknown) => { name: string } };
        }
      ).eventClass;
      if (eventClass) {
        try {
          let tempInstance;
          try {
            tempInstance = eventClass.fromJSON({});
          } catch {
            tempInstance = eventClass.fromJSON({ timestamp: new Date() });
          }
          return tempInstance.name;
        } catch {
          this.logger.warn(`Could not extract event type for handler ${handler.constructor.name}`);
        }
      }
    } catch (error) {
      this.logger.debug(`Failed to extract event type: ${error}`);
    }
    return null;
  }
}
