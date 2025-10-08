import { StringValueObject, type IValueObject } from '../../../general';
import { DomainValidationException } from '../../../errors';

let topicSequence = 0;

export class OutboxTopic extends StringValueObject implements IValueObject<string> {
  constructor(value: string) {
    super(value);
  }

  validate(): void {
    super.validate();
    if (!this.value?.trim()) {
      throw new DomainValidationException('OutboxTopic', this.value, 'Topic cannot be empty');
    }
  }

  static random(): OutboxTopic {
    topicSequence += 1;
    return new OutboxTopic(`topic.${topicSequence}`);
  }
}
