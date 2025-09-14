import { DomainValidationException } from '../../../errors';
import { DateVO } from './DateValueObject';

export interface TimestampsData {
  createdAt: Date;
  updatedAt: Date;
}

export class Timestamps {
  readonly createdAt: DateVO;
  updatedAt: DateVO;

  constructor(data: TimestampsData) {
    this.createdAt = new DateVO(data.createdAt);
    this.updatedAt = new DateVO(data.updatedAt);

    this.validate();
  }

  static create(): Timestamps {
    const now = new Date();
    return new Timestamps({
      createdAt: now,
      updatedAt: now,
    });
  }

  static random(): Timestamps {
    return new Timestamps({
      createdAt: DateVO.dateVOAtDaysFromNow(Math.floor(Math.random() * -100)).toValue(),
      updatedAt: DateVO.dateVOAtDaysFromNow(Math.floor(Math.random() * -100)).toValue(),
    });
  }

  update(): void {
    this.updatedAt = new DateVO(new Date());
  }

  toValue(): TimestampsData {
    return {
      createdAt: this.createdAt.toValue(),
      updatedAt: this.updatedAt.toValue(),
    };
  }

  equals(other: Timestamps): boolean {
    return this.createdAt.equals(other.createdAt) && this.updatedAt.equals(other.updatedAt);
  }

  private validate(): void {
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
