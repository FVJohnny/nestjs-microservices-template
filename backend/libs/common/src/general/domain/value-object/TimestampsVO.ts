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
  }

  static create(): Timestamps {
    const now = new Date();
    return new Timestamps({
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

  equals(other: Timestamps): boolean {
    return this.createdAt.equals(other.createdAt) && this.updatedAt.equals(other.updatedAt);
  }
}
