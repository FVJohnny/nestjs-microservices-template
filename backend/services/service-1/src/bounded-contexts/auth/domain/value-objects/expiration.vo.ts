import { ValueObject } from '@libs/nestjs-common';

export class Expiration extends ValueObject<Date> {
  constructor(value: Date) {
    super(value);
  }

  static atHoursFromNow(hours: number): Expiration {
    return new Expiration(new Date(new Date().getTime() + hours * 60 * 60 * 1000));
  }

  isExpired(): boolean {
    return new Date() > this.toValue();
  }
}
