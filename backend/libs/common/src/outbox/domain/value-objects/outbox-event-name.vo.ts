import { StringValueObject } from '../../../general';
import { DomainValidationException } from '../../../errors';

let eventNameSequence = 0;

export class OutboxEventName extends StringValueObject {
  constructor(value: string) {
    OutboxEventName.ensureIsValid(value);
    super(value);
  }

  static ensureIsValid(value: string) {
    if (!value?.trim()) {
      throw new DomainValidationException('OutboxEventName', value, 'Event name cannot be empty');
    }
  }

  static random(): OutboxEventName {
    eventNameSequence += 1;
    return new OutboxEventName(`Outbox.Event.${eventNameSequence}`);
  }
}
