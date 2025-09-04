import { isDeepStrictEqual } from 'node:util';

import type { IEvent } from '@nestjs/cqrs';
import { AggregateRoot as CQRSAggregateRoot } from '@nestjs/cqrs';

/**
 * Base class for aggregate roots in Domain-Driven Design
 */
export abstract class AggregateRoot extends CQRSAggregateRoot<IEvent> {

  /**
   * Convert the aggregate to its primitive representation
   * This is used for persistence and serialization
   */
  abstract toValue(): any;

  /**
   * Compares two aggregate roots for equality based on their primitive values
   * Uses Node's built-in deep equality check
   */
  equals(other?: AggregateRoot | null): boolean {
    return isDeepStrictEqual(this.toValue(), other?.toValue());
  }
}