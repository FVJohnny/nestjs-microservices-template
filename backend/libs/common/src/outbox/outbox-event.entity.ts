export interface OutboxEventValue {
  id: string;
  eventName: string;
  topic: string;
  payload: string;
  createdAt: Date;
  processedAt: Date;
  retryCount: number;
  maxRetries: number;
}

export class OutboxEvent {
  // Sentinel date representing "never processed" - Unix epoch (January 1, 1970)
  static readonly NEVER_PROCESSED = new Date(0);
  
  id: string;
  eventName: string;
  topic: string;
  payload: string;
  createdAt: Date;
  processedAt: Date;
  retryCount: number;
  maxRetries: number;

  constructor(props: OutboxEventValue) {
    this.id = props.id;
    this.eventName = props.eventName;
    this.topic = props.topic;
    this.payload = props.payload;
    this.createdAt = props.createdAt;
    this.processedAt = props.processedAt || OutboxEvent.NEVER_PROCESSED;
    this.retryCount = props.retryCount;
    this.maxRetries = props.maxRetries;
  }

  isProcessed(): boolean {
    return this.processedAt.getTime() !== OutboxEvent.NEVER_PROCESSED.getTime();
  }

  isProcessedBefore(date: Date): boolean {
    return this.isProcessed() && this.processedAt < date;
  }

  canRetry(): boolean {
    return this.retryCount < this.maxRetries;
  }

  isUnprocessed(): boolean {
    return this.processedAt.getTime() === OutboxEvent.NEVER_PROCESSED.getTime();
  }

  toValue(): OutboxEventValue {
    return {
      id: this.id,
      eventName: this.eventName,
      topic: this.topic,
      payload: this.payload,
      createdAt: this.createdAt,
      processedAt: this.processedAt,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
    };
  }

  static fromValue(value: OutboxEventValue): OutboxEvent {
    return new OutboxEvent({
      id: value.id,
      eventName: value.eventName,
      topic: value.topic,
      payload: value.payload,
      createdAt: new Date(value.createdAt),
      processedAt: new Date(value.processedAt),
      retryCount: value.retryCount,
      maxRetries: value.maxRetries,
    });
  }

  async markAsProcessed(): Promise<void> {
    this.processedAt = new Date();
  }

  async incrementRetry(): Promise<void> {
    this.retryCount += 1;
  }
}
