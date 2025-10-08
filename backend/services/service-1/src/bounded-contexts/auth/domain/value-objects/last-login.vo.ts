import { DateVO, DomainValidationException } from '@libs/nestjs-common';

export class LastLogin extends DateVO {
  private internalValue: Date;

  constructor(value: Date) {
    super(value);
    this.internalValue = value;
    this.validate();
  }

  static now(): LastLogin {
    return new LastLogin(new Date());
  }

  static never(): LastLogin {
    return new LastLogin(new Date(0));
  }

  static random(): LastLogin {
    // Generate a random date between 30 days ago and now
    const now = Date.now();
    const thirtyDaysAgo = DateVO.dateVOAtDaysFromNow(-30).toValue().getTime();
    const randomTime = thirtyDaysAgo + Math.random() * (now - thirtyDaysAgo);
    return new LastLogin(new Date(randomTime));
  }

  private validate(): void {
    const now = new Date();
    if (this.toValue() > now) {
      throw new DomainValidationException(
        'lastLogin',
        this.toValue(),
        'Last login date cannot be in the future',
      );
    }
  }

  isNever(): boolean {
    return this.internalValue.getTime() === 0;
  }

  wasWithinDays(withinDays: number = 7): boolean {
    if (this.isNever()) {
      return false;
    }
    const daysAgo = Math.abs(this.daysFromNow());
    return daysAgo <= withinDays;
  }

  toValue(): Date {
    return this.internalValue;
  }
}
