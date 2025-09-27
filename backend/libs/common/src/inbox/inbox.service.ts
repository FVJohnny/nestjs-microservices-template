import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { CorrelationLogger } from '../logger';
import type { InboxRepository } from './domain/inbox.repository';
import { INBOX_REPOSITORY_TOKEN } from './inbox.constants';
import { InboxEvent } from './domain/inbox-event.entity';
import type { IIntegrationEventHandler } from '../integration-events/listener/integration-event-listener.base';
import type { ParsedIntegrationMessage } from '../integration-events/types/integration-event.types';
import { InboxEventName, InboxPayload, InboxTopic } from './domain/value-objects';
import { TracingService } from '../tracing';
import { normalizeError } from '../utils';
import { Id } from '../general';

@Injectable()
export class InboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new CorrelationLogger(InboxService.name);
  private processingInterval?: NodeJS.Timeout;
  private readonly eventHandlers = new Map<string, Map<string, IIntegrationEventHandler>>(); // topic -> eventName -> handler

  private readonly config = {
    batchSize: 10,
    intervalMs: 5000,
  };

  constructor(
    @Inject(INBOX_REPOSITORY_TOKEN)
    private readonly inboxRepository: InboxRepository,
  ) {}

  async onModuleInit() {
    TracingService.runWithNewMetadata(() => {
      this.processingInterval = setInterval(
        () => this.processInboxEvents(),
        this.config.intervalMs,
      );

      this.logger.log(`Inbox processor started with ${this.config.intervalMs}ms interval`);
    });
  }

  async onModuleDestroy() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    this.logger.log('Inbox processor stopped');
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

  private safeProcessEvent(event: InboxEvent): Promise<void> {
    return this.processEvent(event).catch((error) => {
      this.logger.error(
        `❌ Error processing inbox event. Topic: ${event.topic.toValue()}, Event: ${event.eventName.toValue()} ( id: ${event.id.toValue()})`,
        normalizeError(error),
      );
      event.markAsFailed();
      return this.inboxRepository.save(event);
    });
  }

  private async processEvent(event: InboxEvent): Promise<void> {
    const eventId = event.id.toValue();
    const eventName = event.eventName.toValue();
    const topic = event.topic.toValue();

    this.logger.log(
      `🔄 Processing inbox event. Topic: ${topic}, Event: ${eventName} ( id: ${eventId})`,
    );
    // Mark as processing
    event.markAsProcessing();
    await this.inboxRepository.save(event);

    // Find the appropriate handler and parse the event payload
    const handler = this.findHandler(topic, eventName);
    const message = JSON.parse(event.payload.toValue()) as ParsedIntegrationMessage;

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
