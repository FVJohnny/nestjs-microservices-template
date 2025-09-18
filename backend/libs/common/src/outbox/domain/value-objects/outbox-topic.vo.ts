import { StringValueObject } from '../../../general';
import { DomainValidationException } from '../../../errors';

let topicSequence = 0;

export class OutboxTopic extends StringValueObject {
  constructor(value: string) {
    OutboxTopic.ensureIsValid(value);
    super(value);
  }

  static ensureIsValid(value: string) {
    if (!value?.trim()) {
      throw new DomainValidationException('OutboxTopic', value, 'Topic cannot be empty');
    }
  }

  static random(): OutboxTopic {
    topicSequence += 1;
    return new OutboxTopic(`topic.${topicSequence}`);
  }
}
