import { DateVO, type IValueObject } from '../../../general';
import { DomainValidationException } from '../../../errors';

export class OutboxProcessedAt extends DateVO implements IValueObject<Date> {
  static readonly NEVER_PROCESSED = new Date(0);
  static readonly MAX_RANDOM_PAST_DAYS = 30;

  constructor(value: Date) {
    super(value);
  }

  validate(): void {
    super.validate();
    this.ensureNotFuture(this.value);
  }

  static never(): OutboxProcessedAt {
    return new OutboxProcessedAt(new Date(0));
  }

  static now(): OutboxProcessedAt {
    return new OutboxProcessedAt(new Date());
  }

  static random(): OutboxProcessedAt {
    const daysAgo = Math.floor(Math.random() * OutboxProcessedAt.MAX_RANDOM_PAST_DAYS) + 1;
    return new OutboxProcessedAt(DateVO.dateVOAtDaysFromNow(-daysAgo).toValue());
  }

  isProcessed(): boolean {
    return !this.isNeverProcessed();
  }

  isNeverProcessed(): boolean {
    return this.toValue().getTime() === OutboxProcessedAt.NEVER_PROCESSED.getTime();
  }

  private ensureNotFuture(value: Date): void {
    if (value.getTime() > Date.now()) {
      throw new DomainValidationException(
        'OutboxProcessedAt',
        value,
        'Processed timestamp cannot be set in the future',
      );
    }
  }
}
