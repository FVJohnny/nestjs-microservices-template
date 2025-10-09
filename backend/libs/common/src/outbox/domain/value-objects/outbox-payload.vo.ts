import { Id, StringValueObject } from '../../../general';
import { DomainValidationException } from '../../../errors';
import type { TraceMetadata } from '../../../tracing';

export class OutboxPayload extends StringValueObject {
  validate(): void {
    super.validate();
    try {
      JSON.parse(this.value);
    } catch (error) {
      throw new DomainValidationException(
        'OutboxPayload',
        this.value,
        `Payload must be valid JSON: ${(error as Error).message}`,
      );
    }
  }

  static fromObject(payload: unknown): OutboxPayload {
    return new OutboxPayload(JSON.stringify(payload));
  }

  static random(): OutboxPayload {
    return OutboxPayload.fromObject({
      id: Id.random().toValue(),
      timestamp: new Date().toISOString(),
    });
  }

  toJSON(): Record<string, unknown> {
    return JSON.parse(this.toValue());
  }

  getTraceMetadata(): TraceMetadata | undefined {
    const payload = this.toJSON() as TraceMetadata;

    return payload.traceId && payload.spanId
      ? { traceId: payload.traceId, spanId: payload.spanId }
      : undefined;
  }
}
