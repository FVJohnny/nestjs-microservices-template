import { DomainValidationException } from '../../../errors';
import { EnumValueObject, type IValueObject } from '../../../general';

export enum InboxStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  DUPLICATE = 'duplicate',
}

export class InboxStatusVO extends EnumValueObject<InboxStatus> implements IValueObject<string> {
  constructor(value: InboxStatus) {
    super(value, Object.values(InboxStatus));
  }

  static pending(): InboxStatusVO {
    return new InboxStatusVO(InboxStatus.PENDING);
  }

  static processing(): InboxStatusVO {
    return new InboxStatusVO(InboxStatus.PROCESSING);
  }

  static processed(): InboxStatusVO {
    return new InboxStatusVO(InboxStatus.PROCESSED);
  }

  static failed(): InboxStatusVO {
    return new InboxStatusVO(InboxStatus.FAILED);
  }

  static duplicate(): InboxStatusVO {
    return new InboxStatusVO(InboxStatus.DUPLICATE);
  }

  static random(): InboxStatusVO {
    const statuses = Object.values(InboxStatus);
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    return new InboxStatusVO(randomStatus);
  }

  isPending(): boolean {
    return this.toValue() === InboxStatus.PENDING;
  }

  isProcessing(): boolean {
    return this.toValue() === InboxStatus.PROCESSING;
  }

  isProcessed(): boolean {
    return this.toValue() === InboxStatus.PROCESSED;
  }

  isFailed(): boolean {
    return this.toValue() === InboxStatus.FAILED;
  }

  isDuplicate(): boolean {
    return this.toValue() === InboxStatus.DUPLICATE;
  }

  throwErrorForInvalidValue(value: InboxStatus): void {
    throw new DomainValidationException(`InboxStatus`, value, `Invalid value`);
  }
  validate(): void {
    super.validate();
  }
}
