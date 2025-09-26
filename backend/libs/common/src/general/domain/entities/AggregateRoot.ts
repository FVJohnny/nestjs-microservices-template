import { isDeepStrictEqual } from 'node:util';

import { AggregateRoot, type IEvent } from '@nestjs/cqrs';
import type { Id } from '../value-object/Id';

/**
 * Base class for aggregate roots in Domain-Driven Design
 */
export abstract class SharedAggregateRoot extends AggregateRoot<IEvent> {
  id: Id;

  constructor(id: Id) {
    super();
    this.id = id;
  }

  /**
   * Convert the aggregate to its primitive representation
   * This is used for persistence and serialization
   */
  abstract toValue(): SharedAggregateRootDTO;

  /**
   * Compares two aggregate roots for equality based on their primitive values
   * Uses Node's built-in deep equality check
   */
  equals(other?: SharedAggregateRoot | null): boolean {
    return isDeepStrictEqual(this.toValue(), other?.toValue());
  }
}

export class SharedAggregateRootDTO implements Record<string, unknown> {
  [key: string]: unknown;
  id: string;
}
