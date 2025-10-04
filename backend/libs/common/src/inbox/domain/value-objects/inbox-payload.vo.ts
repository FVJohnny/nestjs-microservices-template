import { StringValueObject } from '../../../general';
import type { TraceMetadata } from '../../../tracing';

export class InboxPayload extends StringValueObject {
  protected ensureIsValid(value: string): void {
    if (!value) {
      throw new Error('InboxPayload cannot be null or undefined');
    }
    try {
      JSON.parse(value);
    } catch {
      throw new Error('InboxPayload must be valid JSON');
    }
  }

  static random(): InboxPayload {
    const randomData = {
      id: Math.random().toString(36).substring(2, 15),
      data: `random-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    return new InboxPayload(JSON.stringify(randomData));
  }

  toJSON(): Record<string, unknown> {
    return JSON.parse(this.toValue());
  }

  getTraceMetadata(): TraceMetadata | undefined {
    const payload = this.toJSON() as { metadata?: TraceMetadata };
    const metadata = payload.metadata;

    return metadata?.traceId && metadata?.spanId
      ? { traceId: metadata.traceId, spanId: metadata.spanId }
      : undefined;
  }
}
