import { ValueObject } from './ValueObject';

export class DateVO extends ValueObject<Date> {
  // Time constants in milliseconds
  private static readonly SECOND_MS = 1000;
  private static readonly MINUTE_MS = 60 * DateVO.SECOND_MS;
  private static readonly HOUR_MS = 60 * DateVO.MINUTE_MS;
  private static readonly DAY_MS = 24 * DateVO.HOUR_MS;

  constructor(value: Date) {
    super(value);
  }

  // Static helper methods to create dates - these return Date objects for concrete VOs to use
  protected static dateVOAtDaysFromNow(days: number): DateVO {
    const date = new Date();
    date.setTime(date.getTime() + days * DateVO.DAY_MS);
    return new DateVO(date);
  }

  protected static dateVOAtHoursFromNow(hours: number): DateVO {
    const date = new Date();
    date.setTime(date.getTime() + hours * DateVO.HOUR_MS);
    return new DateVO(date);
  }

  protected static dateVOAtMinutesFromNow(minutes: number): DateVO {
    const date = new Date();
    date.setTime(date.getTime() + minutes * DateVO.MINUTE_MS);
    return new DateVO(date);
  }

  protected static dateVOAtSecondsFromNow(seconds: number): DateVO {
    const date = new Date();
    date.setTime(date.getTime() + seconds * DateVO.SECOND_MS);
    return new DateVO(date);
  }

  // Instance methods to calculate differences from now to this value
  hoursFromNow(): number {
    return (this.toValue().getTime() - new Date().getTime()) / DateVO.HOUR_MS;
  }

  minutesFromNow(): number {
    return (this.toValue().getTime() - new Date().getTime()) / DateVO.MINUTE_MS;
  }

  secondsFromNow(): number {
    return (this.toValue().getTime() - new Date().getTime()) / DateVO.SECOND_MS;
  }

  daysFromNow(): number {
    return (this.toValue().getTime() - new Date().getTime()) / DateVO.DAY_MS;
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
    return Math.floor(this.diffInMilliseconds(other) / DateVO.SECOND_MS);
  }

  diffInMinutes(other: Date): number {
    return Math.floor(this.diffInMilliseconds(other) / DateVO.MINUTE_MS);
  }

  diffInHours(other: Date): number {
    return Math.floor(this.diffInMilliseconds(other) / DateVO.HOUR_MS);
  }

  diffInDays(other: Date): number {
    return Math.floor(this.diffInMilliseconds(other) / DateVO.DAY_MS);
  }

  isWithinTolerance(expected: Date, toleranceMs: number): boolean {
    return this.diffInMilliseconds(expected) <= toleranceMs;
  }
}
