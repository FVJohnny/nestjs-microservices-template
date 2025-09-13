import { DateValueObject } from '@libs/nestjs-common';

export class Expiration extends DateValueObject {
  constructor(value: Date) {
    super(value);
  }

  static atHoursFromNow(hours: number): Expiration {
    return new Expiration(DateValueObject.dateVOAtHoursFromNow(hours).toValue());
  }

  static atMinutesFromNow(minutes: number): Expiration {
    return new Expiration(DateValueObject.dateVOAtMinutesFromNow(minutes).toValue());
  }

  static atSecondsFromNow(seconds: number): Expiration {
    return new Expiration(DateValueObject.dateVOAtSecondsFromNow(seconds).toValue());
  }

  static atDaysFromNow(days: number): Expiration {
    return new Expiration(DateValueObject.dateVOAtDaysFromNow(days).toValue());
  }

  isExpired(): boolean {
    return this.isPast();
  }
}
