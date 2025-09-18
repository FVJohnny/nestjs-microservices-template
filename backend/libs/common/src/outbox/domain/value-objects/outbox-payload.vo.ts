import { Id, StringValueObject } from '../../../general';
import { DomainValidationException } from '../../../errors';

export class OutboxPayload extends StringValueObject {
  constructor(value: string) {
    OutboxPayload.ensureIsValid(value);
    super(value);
  }

  static ensureIsValid(value: string) {
    try {
      JSON.parse(value);
    } catch (error) {
      throw new DomainValidationException(
        'OutboxPayload',
        value,
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

  toObject(): Record<string, unknown> {
    return JSON.parse(this.toValue());
  }
}
