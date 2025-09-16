import { randomUUID } from 'crypto';

import { TracingService } from './tracing.service';

export class TracingMetadata {
  public readonly causationId: string;
  public readonly id: string;
  public readonly correlationId: string;
  public readonly userId: string;

  constructor(params?: Partial<TracingMetadata>) {
    this.id = randomUUID();
    this.causationId = params?.causationId ?? 'none';
    this.correlationId = params?.correlationId ?? TracingService.getCorrelationId() ?? 'none';
    this.userId = params?.userId ?? 'anonymous';
  }

  toJSON(): Record<string, string> {
    return {
      id: this.id,
      correlationId: this.correlationId,
      causationId: this.causationId,
      userId: this.userId,
    };
  }
}
