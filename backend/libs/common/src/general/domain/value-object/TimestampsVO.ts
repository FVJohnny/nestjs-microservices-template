import { DomainValidationException } from '../../../errors';
import { DateVO } from './DateValueObject';

export class Timestamps {
  constructor(
    public readonly createdAt: DateVO,
    public updatedAt: DateVO,
  ) {
    this.validate();
  }

  static create(): Timestamps {
    const now = new Date();
    return new Timestamps(new DateVO(now), new DateVO(now));
  }

  static random(): Timestamps {
    return new Timestamps(
      DateVO.dateVOAtDaysFromNow(Math.floor(Math.random() * -100)),
      DateVO.dateVOAtDaysFromNow(Math.floor(Math.random() * -100)),
    );
  }

  update(): void {
    this.updatedAt = DateVO.now();
  }

  toValue() {
    return {
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
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
