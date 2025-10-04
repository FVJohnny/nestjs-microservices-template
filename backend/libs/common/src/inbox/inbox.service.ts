import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { CorrelationLogger } from '../logger';
import type { InboxRepository } from './domain/inbox.repository';
import { INBOX_REPOSITORY_TOKEN } from './inbox.constants';
import { InboxEvent } from './domain/inbox-event.entity';
import type { IIntegrationEventHandler } from '../integration-events/listener/integration-event-listener.base';
import type { ParsedIntegrationMessage } from '../integration-events/types/integration-event.types';
import { InboxEventName, InboxPayload, InboxTopic } from './domain/value-objects';
import { normalizeError } from '../utils';
import { Id } from '../general';
import { TracingService } from '../tracing';

@Injectable()
export class InboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new CorrelationLogger(InboxService.name);
  private processingInterval?: NodeJS.Timeout;
  private readonly eventHandlers = new Map<string, Map<string, IIntegrationEventHandler>>(); // topic -> eventName -> handler
  private trackEvent?: (topic: string, message: ParsedIntegrationMessage, success: boolean) => void;

  private readonly config = {
    batchSize: 10,
    intervalMs: 5000,
  };

  constructor(
    @Inject(INBOX_REPOSITORY_TOKEN)
    private readonly inboxRepository: InboxRepository,
  ) {}

  async onModuleInit() {
    this.processingInterval = setInterval(() => this.processInboxEvents(), this.config.intervalMs);

    this.logger.log(`Inbox processor started with ${this.config.intervalMs}ms interval`);
  }

  async onModuleDestroy() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    this.logger.log('Inbox processor stopped');
  }

  setEventTracker(
    tracker: (topic: string, message: ParsedIntegrationMessage, success: boolean) => void,
  ): void {
    this.trackEvent = tracker;
  }

  async receiveMessage(
    message: ParsedIntegrationMessage,
    topicName: string,
  ): Promise<{ isNew: boolean; event: InboxEvent }> {
    this.logger.debug(
      `📨 Received message: Topic: ${topicName}, Name: ${message.name}, Id: ${message.id}.`,
    );

    // Check for duplicate
    const existingEvent = await this.inboxRepository.findById(new Id(message.id));
    if (existingEvent) {
      this.logger.warn(
        `🔁 Duplicate message received: Topic: ${topicName}, Name: ${message.name}, Id: ${message.id}.`,
      );
      return { isNew: false, event: existingEvent };
    }

    // Create new inbox event
    const inboxEvent = InboxEvent.create({
      id: new Id(message.id),
      eventName: new InboxEventName(message.name),
      topic: new InboxTopic(topicName),
      payload: new InboxPayload(JSON.stringify(message)),
    });

    await this.inboxRepository.save(inboxEvent);
    this.logger.log(
      `📨 New Integration Event saved!! Topic: ${topicName}, Name: ${message.name}, Id: ${message.id}.  `,
    );

    return { isNew: true, event: inboxEvent };
  }

  registerEventHandler(
    topicName: string,
    eventName: string,
    handler: IIntegrationEventHandler,
  ): void {
    if (!this.eventHandlers.has(topicName)) {
      this.eventHandlers.set(topicName, new Map());
    }

    const topicHandlers = this.eventHandlers.get(topicName)!;
    topicHandlers.set(eventName, handler);

    this.logger.debug(`Registered inbox handler for topic '${topicName}' and event '${eventName}'`);
  }

  private async processInboxEvents(): Promise<void> {
    const pendingEvents = await this.inboxRepository.findPendingEvents(this.config.batchSize);

    if (pendingEvents.length === 0) {
      this.logger.debug('No pending inbox events to process');
      return;
    }

    this.logger.log(`📥 Processing ${pendingEvents.length} pending inbox events`);

    // Process events concurrently but respect the limit
    for (const event of pendingEvents) {
      await this.safeProcessEvent(event);
    }
  }

  private async safeProcessEvent(event: InboxEvent): Promise<void> {
    const eventId = event.id.toValue();
    const eventName = event.eventName.toValue();
    const topic = event.topic.toValue();
    const message = JSON.parse(event.payload.toValue()) as ParsedIntegrationMessage;

    const parentContext =
      message.metadata?.traceId && message.metadata?.spanId
        ? { traceId: message.metadata.traceId, spanId: message.metadata.spanId }
        : undefined;

    return TracingService.withSpan(
      `inbox.process_integration_event.${topic}.${eventName}`,
      async () => {
        try {
          await this.processEvent(event);
          this.trackEvent?.(topic, message, true);
        } catch (error) {
          this.handleEventFailure(event, message, topic, error);
          throw error;
        }
      },
      {
        'inbox.integration_event_id': eventId,
        'inbox.integration_event_name': eventName,
        'inbox.integration_event_topic': topic,
      },
      parentContext,
    ).catch(() => {});
  }

  private handleEventFailure(
    event: InboxEvent,
    message: ParsedIntegrationMessage,
    topic: string,
    error: unknown,
  ) {
    return TracingService.withSpan(
      'inbox.handle_event_failure',
      async () => {
        this.logger.error(
          `❌ Error processing inbox event. Topic: ${event.topic.toValue()}, Event: ${event.eventName.toValue()} ( id: ${event.id.toValue()})`,
          normalizeError(error),
        );
        event.markAsFailed();
        await this.inboxRepository.save(event);
        this.trackEvent?.(topic, message, false);
      },
      {
        'inbox.event_id': event.id.toValue(),
        'inbox.event_name': event.eventName.toValue(),
        'inbox.topic': topic,
        'error.message': error instanceof Error ? error.message : 'Unknown error',
      },
    );
  }

  private async processEvent(event: InboxEvent): Promise<void> {
    const eventId = event.id.toValue();
    const eventName = event.eventName.toValue();
    const topic = event.topic.toValue();

    // Parse message to extract trace metadata
    const message = JSON.parse(event.payload.toValue()) as ParsedIntegrationMessage;

    this.logger.log(
      `🔄 Processing inbox event. Topic: ${topic}, Event: ${eventName} ( id: ${eventId})`,
    );
    // Mark as processing
    event.markAsProcessing();
    await this.inboxRepository.save(event);

    // Find the appropriate handler
    const handler = this.findHandler(topic, eventName);

    // Execute the handler
    const startTime = Date.now();
    await handler.handle(message);
    const duration = Date.now() - startTime;

    // Mark as processed
    event.markAsProcessed();
    await this.inboxRepository.save(event);

    this.logger.log(
      `✅ Successfully processed inbox event in ${duration}ms. Topic: ${topic}, Event: ${eventName} ( id: ${eventId})`,
    );
  }

  private findHandler(topic: string, eventName: string): IIntegrationEventHandler {
    const topicHandlers = this.eventHandlers.get(topic);
    const handler = topicHandlers?.get(eventName);

    if (!handler) {
      throw new Error(`No handler registered for topic '${topic}' and event '${eventName}'`);
    }

    return handler;
  }
}
