export interface OutboxEventValue {
  id: string;
  eventName: string;
  topic: string;
  payload: string;
  createdAt: Date;
  processedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

export class OutboxEvent {
  id: string;
  eventName: string;
  topic: string;
  payload: string;
  createdAt: Date;
  processedAt?: Date;
  retryCount: number;
  maxRetries: number;

  constructor(props: OutboxEventValue) {
    this.id = props.id;
    this.eventName = props.eventName;
    this.topic = props.topic;
    this.payload = props.payload;
    this.createdAt = props.createdAt;
    this.processedAt = props.processedAt;
    this.retryCount = props.retryCount;
    this.maxRetries = props.maxRetries;
  }

  isProcessed(): boolean {
    return !!this.processedAt;
  }

  isProcessedBefore(date: Date): boolean {
    return this.isProcessed() && this.processedAt! < date;
  }

  canRetry(): boolean {
    return this.retryCount < this.maxRetries;
  }

  isUnprocessed(): boolean {
    return !this.processedAt;
  }

  toValue(): OutboxEventValue {
    const base: OutboxEventValue = {
      id: this.id,
      eventName: this.eventName,
      topic: this.topic,
      payload: this.payload,
      createdAt: this.createdAt,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
    };
    if (this.processedAt) {
      base.processedAt = this.processedAt;
    }
    return base;
  }

  static fromValue(value: OutboxEventValue): OutboxEvent {
    return new OutboxEvent({
      id: value.id,
      eventName: value.eventName,
      topic: value.topic,
      payload: value.payload,
      createdAt: new Date(value.createdAt),
      processedAt: value.processedAt ? new Date(value.processedAt) : undefined,
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
