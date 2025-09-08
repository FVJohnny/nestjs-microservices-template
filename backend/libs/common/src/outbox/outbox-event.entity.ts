export class OutboxEvent {
  constructor(
    public id: string,
    public eventName: string,
    public topic: string,
    public payload: string,
    public createdAt: Date = new Date(),
    public processedAt?: Date,
    public retryCount: number = 0,
    public maxRetries: number = 3,
  ) {}

  isProcessed(): boolean {
    return !!this.processedAt;
  }

  canRetry(): boolean {
    return this.retryCount < this.maxRetries;
  }

  markAsProcessed(): void {
    this.processedAt = new Date();
  }

  incrementRetry(): void {
    this.retryCount++;
  }
}
