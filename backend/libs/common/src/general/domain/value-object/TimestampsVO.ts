import { DateVO } from './DateValueObject';

export interface TimestampsData {
  createdAt: Date;
  updatedAt: Date;
}

export class TimestampsVO {
  readonly createdAt: DateVO;
  updatedAt: DateVO;

  constructor(data: TimestampsData) {
    this.createdAt = new DateVO(data.createdAt);
    this.updatedAt = new DateVO(data.updatedAt);
  }

  static create(): TimestampsVO {
    const now = new Date();
    return new TimestampsVO({
      createdAt: now,
      updatedAt: now,
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

  equals(other: TimestampsVO): boolean {
    return this.createdAt.equals(other.createdAt) && this.updatedAt.equals(other.updatedAt);
  }
}
