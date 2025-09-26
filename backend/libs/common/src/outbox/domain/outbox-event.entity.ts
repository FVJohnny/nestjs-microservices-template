import { Id, SharedAggregateRoot, SharedAggregateRootDTO } from '../../general';
import { DomainValidationException } from '../../errors';
import {
  OutboxCreatedAt,
  OutboxEventName,
  OutboxMaxRetries,
  OutboxPayload,
  OutboxProcessedAt,
  OutboxRetryCount,
  OutboxTopic,
} from './value-objects';

export class OutboxEventDTO extends SharedAggregateRootDTO {
  eventName!: string;
  topic!: string;
  payload!: string;
  createdAt!: Date;
  processedAt!: Date;
  retryCount!: number;
  maxRetries!: number;

  static random(overrides: Partial<OutboxEventDTO> = {}): OutboxEventDTO {
    const entity = OutboxEvent.random({
      id: overrides.id ? new Id(overrides.id) : undefined,
      eventName: overrides.eventName ? new OutboxEventName(overrides.eventName) : undefined,
      topic: overrides.topic ? new OutboxTopic(overrides.topic) : undefined,
      payload: overrides.payload ? new OutboxPayload(overrides.payload) : undefined,
      createdAt: overrides.createdAt ? new OutboxCreatedAt(overrides.createdAt) : undefined,
      processedAt: overrides.processedAt ? new OutboxProcessedAt(overrides.processedAt) : undefined,
      retryCount: overrides.retryCount ? new OutboxRetryCount(overrides.retryCount) : undefined,
      maxRetries: overrides.maxRetries ? new OutboxMaxRetries(overrides.maxRetries) : undefined,
    });
    return entity.toValue();
  }
}

export interface OutboxEventAttributes {
  id: Id;
  eventName: OutboxEventName;
  topic: OutboxTopic;
  payload: OutboxPayload;
  createdAt: OutboxCreatedAt;
  processedAt: OutboxProcessedAt;
  retryCount: OutboxRetryCount;
  maxRetries: OutboxMaxRetries;
}

export interface CreateOutboxEventProps {
  eventName: OutboxEventName;
  topic: OutboxTopic;
  payload: OutboxPayload;
}

export class OutboxEvent extends SharedAggregateRoot implements OutboxEventAttributes {
  static readonly NEVER_PROCESSED = OutboxProcessedAt.NEVER_PROCESSED;

  eventName: OutboxEventName;
  topic: OutboxTopic;
  payload: OutboxPayload;
  createdAt: OutboxCreatedAt;
  processedAt: OutboxProcessedAt;
  retryCount: OutboxRetryCount;
  maxRetries: OutboxMaxRetries;

  constructor(props: OutboxEventAttributes) {
    super(props.id);
    this.eventName = props.eventName;
    this.topic = props.topic;
    this.payload = props.payload;
    this.createdAt = props.createdAt;
    this.processedAt = props.processedAt;
    this.retryCount = props.retryCount;
    this.maxRetries = props.maxRetries;
    this.ensureRetryNotExceeded();
  }

  static create(props: CreateOutboxEventProps): OutboxEvent {
    return new OutboxEvent({
      id: Id.random(),
      eventName: props.eventName,
      topic: props.topic,
      payload: props.payload,
      createdAt: OutboxCreatedAt.now(),
      processedAt: OutboxProcessedAt.never(),
      retryCount: OutboxRetryCount.zero(),
      maxRetries: OutboxMaxRetries.default(),
    });
  }

  static random(overrides: Partial<OutboxEventAttributes> = {}): OutboxEvent {
    const maxRetries = overrides.maxRetries ?? OutboxMaxRetries.random();

    return new OutboxEvent({
      id: overrides.id ?? Id.random(),
      eventName: overrides.eventName ?? OutboxEventName.random(),
      topic: overrides.topic ?? OutboxTopic.random(),
      payload: overrides.payload ?? OutboxPayload.random(),
      createdAt: overrides.createdAt ?? OutboxCreatedAt.random(),
      processedAt:
        overrides.processedAt ??
        (Math.random() > 0.5 ? OutboxProcessedAt.random() : OutboxProcessedAt.never()),
      retryCount: overrides.retryCount ?? OutboxRetryCount.random(maxRetries.toValue()),
      maxRetries,
    });
  }

  isProcessed(): boolean {
    return this.processedAt.isProcessed();
  }

  isProcessedBefore(date: Date): boolean {
    return this.isProcessed() && this.processedAt.toValue() < date;
  }

  isUnprocessed(): boolean {
    return this.processedAt.isNeverProcessed();
  }

  canRetry(): boolean {
    return this.retryCount.isLessThan(this.maxRetries) && !this.isProcessed();
  }

  toValue(): OutboxEventDTO {
    const dto = new OutboxEventDTO();
    dto.id = this.id.toValue();
    dto.eventName = this.eventName.toValue();
    dto.topic = this.topic.toValue();
    dto.payload = this.payload.toValue();
    dto.createdAt = this.createdAt.toValue();
    dto.processedAt = this.processedAt.toValue();
    dto.retryCount = this.retryCount.toValue();
    dto.maxRetries = this.maxRetries.toValue();
    return dto;
  }

  static fromValue(value: OutboxEventDTO): OutboxEvent {
    return new OutboxEvent({
      id: new Id(value.id),
      eventName: new OutboxEventName(value.eventName),
      topic: new OutboxTopic(value.topic),
      payload: new OutboxPayload(value.payload),
      createdAt: new OutboxCreatedAt(new Date(value.createdAt)),
      processedAt: new OutboxProcessedAt(new Date(value.processedAt)),
      retryCount: new OutboxRetryCount(value.retryCount),
      maxRetries: new OutboxMaxRetries(value.maxRetries),
    });
  }

  markAsProcessed(): void {
    this.processedAt = OutboxProcessedAt.now();
  }

  incrementRetry(): void {
    if (!this.canRetry()) {
      throw new DomainValidationException(
        'OutboxRetryCount',
        this.retryCount.toValue(),
        'Cannot increment retry count beyond max retries',
      );
    }
    this.retryCount = this.retryCount.increment();
  }

  private ensureRetryNotExceeded(): void {
    if (this.retryCount.toValue() > this.maxRetries.toValue()) {
      throw new DomainValidationException(
        'OutboxRetryCount',
        this.retryCount.toValue(),
        'Retry count cannot exceed max retries',
      );
    }
  }
}
