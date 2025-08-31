/**
 * Base class for composite value objects that contain multiple value objects or primitives.
 * Unlike ValueObject<T> which handles single primitive values, this class is for
 * value objects that are composed of multiple values.
 */
export abstract class CompositeValueObject<T extends Record<string, any>> {
  /**
   * Converts the composite value object to its primitive representation
   * This should return a plain object with primitive values
   */
  abstract toValue(): T;

  /**
   * Compares this composite value object with another for equality
   * Default implementation uses deep comparison of primitives
   * Override this method if you need custom equality logic
   */
  equals(other: CompositeValueObject<T>): boolean {
    if (!other) return false;
    if (other.constructor !== this.constructor) return false;
    
    return this.deepEquals(this.toValue(), other.toValue());
  }

  /**
   * Deep equality comparison for objects
   */
  private deepEquals(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    
    if (obj1 == null || obj2 == null) return false;
    
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
      return obj1 === obj2;
    }
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.deepEquals(obj1[key], obj2[key])) return false;
    }
    
    return true;
  }

  /**
   * Returns a string representation of the composite value object
   * Default implementation returns JSON string
   * Override this method if you need custom string representation
   */
  toString(): string {
    return JSON.stringify(this.toValue());
  }
}