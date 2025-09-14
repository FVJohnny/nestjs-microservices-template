import { HttpStatus } from '@nestjs/common';

import type { Metadata } from '../utils/metadata';
import { BaseException } from './base.exception';

export class UnauthorizedException extends BaseException {
  constructor(metadata?: Metadata) {
    super('Unauthorized', 'UNAUTHORIZED', HttpStatus.UNAUTHORIZED, { ...metadata });
  }
}

export class NotFoundException extends BaseException {
  constructor(entityName?: string, metadata?: Metadata) {
    super(`Entity ${entityName} not found`, 'ENTITY_NOT_FOUND', HttpStatus.NOT_FOUND, {
      ...metadata,
    });
  }
}

export class AlreadyExistsException extends BaseException {
  constructor(field: string, value: string, metadata?: Metadata) {
    super(
      `Entity already exists with ${field}: ${value}`,
      'ENTITY_ALREADY_EXISTS',
      HttpStatus.CONFLICT,
      { ...metadata },
    );
  }
}

export class InfrastructureException extends BaseException {
  constructor(operation: string, details: string, cause: Error, metadata?: Metadata) {
    super(
      `Infrastructure operation '${operation}' failed: ${details}`,
      'INFRASTRUCTURE_ERROR',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { operation, details, ...metadata },
      cause,
    );
  }
}

export class ApplicationException extends BaseException {
  constructor(message: string, metadata?: Metadata) {
    super(message, 'APPLICATION_ERROR', HttpStatus.INTERNAL_SERVER_ERROR, { ...metadata });
  }
}
