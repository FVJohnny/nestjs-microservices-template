import { ValueObject } from './base.vo';

export abstract class NumberValueObject extends ValueObject<number> {
  isBiggerThan(other: NumberValueObject): boolean {
    return this.toValue() > other.toValue();
  }
}
