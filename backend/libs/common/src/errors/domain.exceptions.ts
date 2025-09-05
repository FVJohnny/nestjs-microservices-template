import { HttpStatus } from '@nestjs/common';

import type { Metadata } from '../utils/metadata';
import { BaseException } from './base.exception';

/**
 * Thrown when domain business rules are violated
 */
export class DomainValidationException extends BaseException {
  constructor(
    field: string,
    value: unknown,
    rule: string,
    metadata?: Metadata,
  ) {
    super(
      `Domain validation failed for field '${field}': ${rule}`,
      'DOMAIN_VALIDATION_FAILED',
      HttpStatus.UNPROCESSABLE_ENTITY,
      { field, value, rule, ...metadata },
    );
  }
}

/**
 * Thrown when an operation is not allowed in the current state
 */
export class InvalidOperationException extends BaseException {
  constructor(
    operation: string,
    currentState: string,
    metadata?: Metadata,
  ) {
    super(
      `Operation '${operation}' is not allowed in current state '${currentState}'`,
      'INVALID_OPERATION',
      HttpStatus.BAD_REQUEST,
      { operation, currentState, ...metadata },
    );
  }
}

/**
 * Thrown when aggregate constraints are violated
 */
export class AggregateConstraintException extends BaseException {
  constructor(
    aggregateName: string,
    constraintName: string,
    details: string,
    metadata?: Metadata,
  ) {
    super(
      `Aggregate constraint violation in ${aggregateName}: ${constraintName} - ${details}`,
      'AGGREGATE_CONSTRAINT_VIOLATION',
      HttpStatus.BAD_REQUEST,
      { aggregateName, constraintName, details, ...metadata },
    );
  }
}