import { HttpStatus } from '@nestjs/common';

import type { Metadata } from '../utils/metadata';
import { BaseException } from './base.exception';

/**
 * Infrastructure-specific exceptions
 * These represent technical/infrastructure failures
 */


/**
 * Thrown when message broker operations fail
 */
export class MessageBrokerException extends BaseException {
  constructor(
    broker: string,
    operation: string,
    topic: string,
    details: string,
    metadata?: Metadata,
    cause?: Error,
  ) {
    super(
      `Message broker '${broker}' operation '${operation}' on topic '${topic}' failed: ${details}`,
      'MESSAGE_BROKER_ERROR',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { broker, operation, topic, details, ...metadata },
      cause,
    );
  }
}

/**
 * Thrown when external service calls fail
 */
export class ExternalServiceException extends BaseException {
  constructor(
    serviceName: string,
    operation: string,
    details: string,
    metadata?: Metadata,
    cause?: Error,
  ) {
    super(
      `External service '${serviceName}' operation '${operation}' failed: ${details}`,
      'EXTERNAL_SERVICE_ERROR',
      HttpStatus.BAD_GATEWAY,
      { serviceName, operation, details, ...metadata },
      cause,
    );
  }
}

