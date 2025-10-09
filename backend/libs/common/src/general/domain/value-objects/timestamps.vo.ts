import { DomainValidationException } from '../../../errors';
import { DateVO } from './date.vo';
import type { IValueObject } from './base.vo';

interface TimestampsValue extends Record<string, unknown> {
  createdAt: Date;
  updatedAt: Date;
}

export class Timestamps implements IValueObject<TimestampsValue> {
  public readonly createdAt: DateVO;
  public readonly updatedAt: DateVO;

  constructor(createdAt: DateVO, updatedAt: DateVO) {
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.validate();
  }

  static create(): Timestamps {
    const now = new Date();
    return new Timestamps(new DateVO(now), new DateVO(now));
  }

  static random({
    createdAt,
    updatedAt,
  }: { createdAt?: DateVO; updatedAt?: DateVO } = {}): Timestamps {
    return new Timestamps(
      createdAt ?? DateVO.dateVOAtDaysFromNow(Math.floor(Math.random() * -100)),
      updatedAt ?? DateVO.dateVOAtDaysFromNow(Math.floor(Math.random() * -100)),
    );
  }

  toValue(): TimestampsValue {
    return {
      createdAt: this.createdAt.toValue(),
      updatedAt: this.updatedAt.toValue(),
    };
  }

  equals(other: Timestamps): boolean {
    if (!(other instanceof Timestamps)) {
      return false;
    }
    return this.createdAt.equals(other.createdAt) && this.updatedAt.equals(other.updatedAt);
  }

  validate(): void {
    const now = new Date();

    if (this.createdAt.toValue() > now) {
      throw new DomainValidationException(
        'createdAt',
        this.createdAt.toValue(),
        'Creation date cannot be in the future',
      );
    }

    if (this.updatedAt.toValue() > now) {
      throw new DomainValidationException(
        'updatedAt',
        this.updatedAt.toValue(),
        'Update date cannot be in the future',
      );
    }
  }
}
