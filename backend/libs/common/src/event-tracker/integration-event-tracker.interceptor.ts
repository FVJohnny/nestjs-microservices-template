import { Injectable, Inject } from '@nestjs/common';
import { EventTrackerService } from './event-tracker.service';
import {
  IIntegrationEventHandler,
  INTEGRATION_EVENT_LISTENER,
  type IntegrationEventListener,
} from '../integration-events/listener/integration-event-listener.base';
import type { ParsedIntegrationMessage } from '../integration-events/types/integration-event.types';
import { TracingService } from '../tracing/tracing.service';

/**
 * Universal Integration Event Tracker that intercepts Integration Event Listener
 */
@Injectable()
export class IntegrationEventTrackerInterceptor {
  constructor(
    private readonly eventTracker: EventTrackerService,
    @Inject(INTEGRATION_EVENT_LISTENER)
    private readonly integrationEventListener: IntegrationEventListener,
  ) {
    this.wrapIntegrationEventListener();
  }

  /**
   * Wraps the integration event listener methods to add tracking
   */
  private wrapIntegrationEventListener(): void {
    // Store original methods
    const originalRegisterEventHandler = this.integrationEventListener.registerEventHandler.bind(
      this.integrationEventListener,
    );
    const originalHandleMessage = this.integrationEventListener.handleMessage.bind(
      this.integrationEventListener,
    );

    // Wrap registerEventHandler
    this.integrationEventListener.registerEventHandler = async (
      topicName: string,
      eventName: string,
      handler: IIntegrationEventHandler,
    ) => {
      await originalRegisterEventHandler(topicName, eventName, handler);

      // Extract event name for tracking initialization
      if (eventName) {
        this.eventTracker.initializeStats(topicName, eventName);
      }
    };

    // Wrap handleMessage
    this.integrationEventListener.handleMessage = async (
      topicName: string,
      message: ParsedIntegrationMessage,
    ) => {
      // Run the entire message handling within the tracing context
      const context = {
        ...message.metadata,
        causationId: message.metadata.id,
      };
      return TracingService.runWithContext(context, async () => {
        try {
          const result = await originalHandleMessage(topicName, message);
          if (result) {
            this.eventTracker.trackEvent(topicName, message, true);
          }
          return result;
        } catch (error) {
          this.eventTracker.trackEvent(topicName, message, false);
          throw error;
        }
      });
    };
  }
}
