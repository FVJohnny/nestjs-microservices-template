import { HttpStatus } from '@nestjs/common';

import { BaseException } from './base.exception';

export class UnauthorizedException extends BaseException {
  constructor() {
    super('Unauthorized', 'UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
  }
}

export class NotFoundException extends BaseException {
  constructor(entityName?: string) {
    super(`Entity ${entityName} not found`, 'ENTITY_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}

export class AlreadyExistsException extends BaseException {
  constructor(field: string, value: string) {
    super(
      `Entity already exists with ${field}: ${value}`,
      'ENTITY_ALREADY_EXISTS',
      HttpStatus.CONFLICT,
    );
  }
}

export class InfrastructureException extends BaseException {
  constructor(operation: string, details: string, cause: Error) {
    super(
      `Infrastructure operation '${operation}' failed: ${details}`,
      'INFRASTRUCTURE_ERROR',
      HttpStatus.INTERNAL_SERVER_ERROR,
      cause,
    );
  }
}

export class ApplicationException extends BaseException {
  constructor(message: string) {
    super(message, 'APPLICATION_ERROR', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
