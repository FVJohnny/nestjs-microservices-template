import { isDeepStrictEqual } from "util";

/**
 * Base class for composite value objects that contain multiple value objects or primitives.
 * Unlike ValueObject<T> which handles single primitive values, this class is for
 * value objects that are composed of multiple values.
 */
export abstract class CompositeValueObject<T extends Record<string, unknown>> {

  abstract toValue(): T;

  equals(other: CompositeValueObject<T>): boolean {
    if (!other) return false;
    if (other.constructor !== this.constructor) return false;
    
    return isDeepStrictEqual(this.toValue(), other.toValue());
  }

  toString(): string {
    return JSON.stringify(this.toValue());
  }
}