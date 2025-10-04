import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { type OutboxRepository } from './domain/outbox.repository';
import { INTEGRATION_EVENT_PUBLISHER, type IntegrationEventPublisher } from '../integration-events';
import { OutboxEvent } from './domain/outbox-event.entity';
import { CorrelationLogger } from '../logger';
import { WithSpan } from '../tracing';

export const OUTBOX_REPOSITORY = 'OutboxRepository';

@Injectable()
export class OutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new CorrelationLogger(OutboxService.name);
  private readonly PROCESSING_INTERVAL_MS = 1000;
  private processingInterval?: NodeJS.Timeout;

  constructor(
    @Inject(OUTBOX_REPOSITORY)
    private readonly repository: OutboxRepository,
    @Inject(INTEGRATION_EVENT_PUBLISHER)
    private readonly publisher: IntegrationEventPublisher,
  ) {}

  async onModuleInit() {
    this.processingInterval = setInterval(
      () => this.processOutboxEvents(),
      this.PROCESSING_INTERVAL_MS,
    );

    this.logger.log(`Outbox processor started with ${this.PROCESSING_INTERVAL_MS}ms interval`);
  }

  async onModuleDestroy() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    this.logger.log('Outbox processor stopped');
  }

  @WithSpan('outbox.process_batch')
  async processOutboxEvents() {
    const events = await this.repository.findUnprocessed(10);
    if (!events.length) {
      return;
    }

    this.logger.debug(`Processing ${events.length} outbox events`);

    for (const event of events) {
      await this.processEvent(event);
    }
  }

  private async processEvent(event: OutboxEvent) {
    try {
      await this.publisher.publish(event.topic.toValue(), event.payload.toValue());
      event.markAsProcessed();
      await this.repository.save(event);
      this.logger.debug(`Successfully processed outbox event: ${event.id.toValue()}`);
    } catch (error) {
      await this.handleEventError(event, error);
    }
  }

  @WithSpan('outbox.cleanup_processed_events')
  async cleanupProcessedEvents() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this.repository.deleteProcessed(sevenDaysAgo);
    this.logger.debug('Cleaned up processed outbox events older than 7 days');
  }

  private async handleEventError(event: OutboxEvent, error: unknown) {
    this.logger.error(`Failed to process outbox event ${event.id.toValue()}:`, error as Error);

    if (event.canRetry()) {
      event.incrementRetry();
      await this.repository.save(event);
      this.logger.warn(
        `Incremented retry count for event ${event.id.toValue()}: ${event.retryCount.toValue()}/${event.maxRetries.toValue()}`,
      );
    } else {
      this.logger.error(`Max retries exceeded for event ${event.id.toValue()}, giving up`);
    }
  }
}
