import { ValueObject } from './ValueObject';

export class DateValueObject extends ValueObject<Date> {
  // Time constants in milliseconds
  private static readonly SECOND_MS = 1000;
  private static readonly MINUTE_MS = 60 * DateValueObject.SECOND_MS;
  private static readonly HOUR_MS = 60 * DateValueObject.MINUTE_MS;
  private static readonly DAY_MS = 24 * DateValueObject.HOUR_MS;

  constructor(value: Date) {
    super(value);
  }

  // Static helper methods to create dates - these return Date objects for concrete VOs to use
  protected static dateVOAtDaysFromNow(days: number): DateValueObject {
    const date = new Date();
    date.setTime(date.getTime() + days * DateValueObject.DAY_MS);
    return new DateValueObject(date);
  }

  protected static dateVOAtHoursFromNow(hours: number): DateValueObject {
    const date = new Date();
    date.setTime(date.getTime() + hours * DateValueObject.HOUR_MS);
    return new DateValueObject(date);
  }

  protected static dateVOAtMinutesFromNow(minutes: number): DateValueObject {
    const date = new Date();
    date.setTime(date.getTime() + minutes * DateValueObject.MINUTE_MS);
    return new DateValueObject(date);
  }

  protected static dateVOAtSecondsFromNow(seconds: number): DateValueObject {
    const date = new Date();
    date.setTime(date.getTime() + seconds * DateValueObject.SECOND_MS);
    return new DateValueObject(date);
  }

  // Instance methods to calculate differences from now to this value
  hoursFromNow(): number {
    return (this.toValue().getTime() - new Date().getTime()) / DateValueObject.HOUR_MS;
  }

  minutesFromNow(): number {
    return (this.toValue().getTime() - new Date().getTime()) / DateValueObject.MINUTE_MS;
  }

  secondsFromNow(): number {
    return (this.toValue().getTime() - new Date().getTime()) / DateValueObject.SECOND_MS;
  }

  daysFromNow(): number {
    return (this.toValue().getTime() - new Date().getTime()) / DateValueObject.DAY_MS;
  }

  isPast(): boolean {
    return this.toValue() < new Date();
  }

  isFuture(): boolean {
    return this.toValue() > new Date();
  }

  isToday(): boolean {
    const today = new Date();
    const thisDate = this.toValue();
    return thisDate.toDateString() === today.toDateString();
  }

  diffInMilliseconds(other: Date): number {
    return Math.abs(this.toValue().getTime() - other.getTime());
  }

  diffInSeconds(other: Date): number {
    return Math.floor(this.diffInMilliseconds(other) / DateValueObject.SECOND_MS);
  }

  diffInMinutes(other: Date): number {
    return Math.floor(this.diffInMilliseconds(other) / DateValueObject.MINUTE_MS);
  }

  diffInHours(other: Date): number {
    return Math.floor(this.diffInMilliseconds(other) / DateValueObject.HOUR_MS);
  }

  diffInDays(other: Date): number {
    return Math.floor(this.diffInMilliseconds(other) / DateValueObject.DAY_MS);
  }

  isWithinTolerance(expected: Date, toleranceMs: number): boolean {
    return this.diffInMilliseconds(expected) <= toleranceMs;
  }
}
