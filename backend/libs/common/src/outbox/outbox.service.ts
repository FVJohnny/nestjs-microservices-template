import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { OutboxRepository } from './outbox.repository';
import {
  INTEGRATION_EVENT_PUBLISHER_TOKEN,
  IntegrationEventPublisher,
} from '../integration-events';
import { randomUUID } from 'crypto';
import { OutboxEvent } from './outbox-event.entity';
import { CorrelationLogger } from '../logger';

export const OUTBOX_REPOSITORY_TOKEN = 'OutboxRepository';

@Injectable()
export class OutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new CorrelationLogger(OutboxService.name);
  private readonly PROCESSING_INTERVAL_MS = 1000;
  private processingInterval?: NodeJS.Timeout;

  constructor(
    @Inject(OUTBOX_REPOSITORY_TOKEN)
    private readonly repository: OutboxRepository,
    @Inject(INTEGRATION_EVENT_PUBLISHER_TOKEN)
    private readonly publisher: IntegrationEventPublisher,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Starting outbox processor...');
    await this.processOutboxEvents();

    this.processingInterval = setInterval(
      () =>
        this.processOutboxEvents().catch((error) =>
          this.logger.error('Error in outbox processing interval:', error),
        ),
      this.PROCESSING_INTERVAL_MS,
    );

    this.logger.log(`Outbox processor started with ${this.PROCESSING_INTERVAL_MS}ms interval`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    this.logger.log('Outbox processor stopped');
  }

  async storeEvent(eventName: string, topic: string, payload: string): Promise<void> {
    const event = new OutboxEvent(randomUUID(), eventName, topic, payload);
    await this.repository.save(event);
    this.logger.debug(`Stored outbox event: ${eventName} for topic: ${topic}`);
  }

  async processOutboxEvents(): Promise<void> {
    const events = await this.repository.findUnprocessed(10);
    if (!events.length) return;

    this.logger.debug(`Processing ${events.length} outbox events`);

    for (const event of events) {
      await this.processEvent(event);
    }
  }

  async cleanupProcessedEvents(): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this.repository.deleteProcessed(sevenDaysAgo);
    this.logger.debug('Cleaned up processed outbox events older than 7 days');
  }

  private async processEvent(event: OutboxEvent): Promise<void> {
    try {
      await this.publisher.publish(event.topic, event.payload);
      await this.repository.markAsProcessed(event.id);
      this.logger.debug(`Successfully processed outbox event: ${event.id}`);
    } catch (error) {
      await this.handleEventError(event, error);
    }
  }

  private async handleEventError(event: OutboxEvent, error: unknown): Promise<void> {
    this.logger.error(`Failed to process outbox event ${event.id}:`, error as Error);

    if (event.retryCount < event.maxRetries) {
      await this.repository.incrementRetryCount(event.id);
      this.logger.warn(
        `Incremented retry count for event ${event.id}: ${event.retryCount + 1}/${event.maxRetries}`,
      );
    } else {
      this.logger.error(`Max retries exceeded for event ${event.id}, giving up`);
    }
  }
}
