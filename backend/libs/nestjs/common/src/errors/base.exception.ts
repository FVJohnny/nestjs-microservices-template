import { HttpStatus } from '@nestjs/common';

/**
 * Base exception class for all application errors
 * Provides structure and metadata for error handling
 */
export abstract class BaseException extends Error {
  public readonly timestamp: Date;
  public readonly path?: string;
  public readonly correlationId?: string;
  
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: HttpStatus,
    public readonly metadata?: Record<string, any>,
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
  toJSON(): Record<string, any> {
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
  setPath(path: string): this {
    (this as any).path = path;
    return this;
  }

  /**
   * Set correlation ID for tracing
   */
  setCorrelationId(correlationId: string): this {
    (this as any).correlationId = correlationId;
    return this;
  }
}