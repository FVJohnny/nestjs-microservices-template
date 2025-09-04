import type { HttpStatus } from '@nestjs/common';

import type { Metadata } from '../utils/metadata';

/**
 * Base exception class for all application errors
 * Provides structure and metadata for error handling
 */
export abstract class BaseException extends Error {
  public readonly timestamp: Date;
  public path?: string;
  public correlationId?: string;
  
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: HttpStatus,
    public readonly metadata?: Metadata,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    
    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert exception to JSON for logging and API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      httpStatus: this.httpStatus,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata,
      ...(this.path && { path: this.path }),
      ...(this.correlationId && { correlationId: this.correlationId }),
    };
  }

  /**
   * Set request path context
   */
  setPath(path: string): void {
    this.path = path;
  }

  /**
   * Set correlation ID for tracing
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }
}