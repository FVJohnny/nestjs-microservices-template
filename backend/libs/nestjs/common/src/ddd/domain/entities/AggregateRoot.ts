import { AggregateRoot as CQRSAggregateRoot, IEvent } from '@nestjs/cqrs';
import { isDeepStrictEqual } from 'node:util';

export type Primitives = Record<string, any>;

/**
 * Base class for aggregate roots in Domain-Driven Design
 * 
 * Concrete implementations should provide static methods:
 * - static create(...args: any[]): T
 * - static random(): T  
 * - static fromPrimitives(primitives: Primitives): T
 * 
 * And instance method:
 * - toPrimitives(): Primitives
 */
export abstract class AggregateRoot extends CQRSAggregateRoot<IEvent> {
  /**
   * Convert the aggregate to its primitive representation
   * This is used for persistence and serialization
   */
  abstract toPrimitives(): Primitives;

  /**
   * Compares two aggregate roots for equality based on their primitive values
   * Uses Node's built-in deep equality check
   */
  equals(other?: AggregateRoot | null): boolean {
    return isDeepStrictEqual(this.toPrimitives(), other?.toPrimitives());
  }
}