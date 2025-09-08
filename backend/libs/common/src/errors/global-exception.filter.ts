import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { CorrelationLogger } from '../logger';
import { Request, Response } from 'express';

import { TracingService } from '../tracing/tracing.service';
import type { Metadata } from '../utils/metadata';
import { BaseException } from './base.exception';
/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    cause?: string;
    timestamp: string;
    path: string;
    correlationId?: string;
    metadata?: Metadata;
    stack?: string;
  };
}

/**
 * Global exception filter that standardizes all error responses
 * Handles both custom exceptions and unexpected errors
 */
@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new CorrelationLogger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = TracingService.getCorrelationId();
    const path = request.url;
    const timestamp = new Date().toISOString();

    let errorResponse: ErrorResponse;

    if (exception instanceof BaseException) {
      // Handle custom domain/application exceptions
      errorResponse = this.handleBaseException(exception, path, correlationId, timestamp);
      this.logException(exception, correlationId, false);
    } else if (exception instanceof HttpException) {
      // Handle NestJS HTTP exceptions
      errorResponse = this.handleHttpException(exception, path, correlationId, timestamp);
      this.logException(exception, correlationId, false);
    } else {
      // Handle unexpected errors
      errorResponse = this.handleUnexpectedException(exception, path, correlationId, timestamp);
      this.logException(exception, correlationId, true);
    }

    response.status(this.getHttpStatus(exception)).json(errorResponse);
  }

  private handleBaseException(
    exception: BaseException,
    path: string,
    correlationId: string | undefined,
    timestamp: string,
  ): ErrorResponse {
    // Set context on exception if not already set
    if (!exception.path) {
      exception.setPath(path);
    }
    if (correlationId && !exception.correlationId) {
      exception.setCorrelationId(correlationId);
    }

    return {
      success: false,
      error: {
        code: exception.code,
        message: exception.message,
        cause: exception.cause?.message,
        timestamp,
        path,
        ...(correlationId && { correlationId }),
        ...(exception.metadata && { metadata: exception.metadata }),
      },
    };
  }

  private handleHttpException(
    exception: HttpException,
    path: string,
    correlationId: string | undefined,
    timestamp: string,
  ): ErrorResponse {
    const status = exception.getStatus();
    const response = exception.getResponse() as string | { message: string };

    // Extract message from NestJS exception response
    const message =
      typeof response === 'string' ? response : response?.message || exception.message;

    return {
      success: false,
      error: {
        code: `HTTP_${status}`,
        message: Array.isArray(message) ? message.join(', ') : message,
        timestamp,
        path,
        ...(correlationId && { correlationId }),
      },
    };
  }

  private handleUnexpectedException(
    exception: unknown,
    path: string,
    correlationId: string | undefined,
    timestamp: string,
  ): ErrorResponse {
    const error = exception instanceof Error ? exception : new Error('Unknown error');

    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: this.isProduction() ? 'An unexpected error occurred' : error.message,
        timestamp,
        path,
        ...(correlationId && { correlationId }),
      },
    };
  }

  private getHttpStatus(exception: unknown): number {
    if (exception instanceof BaseException) {
      return exception.httpStatus;
    }
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private logException(exception: unknown, correlationId?: string, isUnexpected = false): void {
    const error = exception instanceof Error ? exception : new Error('Unknown error');
    const logLevel = isUnexpected ? 'error' : 'warn';

    // Build a readable log message
    const logParts = [
      `${error.name}: ${error.message}`,
      ...(correlationId ? [`[correlationId: ${correlationId}]`] : []),
      ...(exception instanceof BaseException ? [`[code: ${exception.code}]`] : []),
      ...(exception instanceof BaseException && exception.metadata
        ? [`[metadata: ${JSON.stringify(exception.metadata)}]`]
        : []),
      ...(exception instanceof BaseException && exception.cause
        ? [`[cause: ${exception.cause.name}: ${exception.cause.message}]`]
        : []),
      ...(error.stack ? [`[stack: ${error.stack}]`] : []),
      ...(exception instanceof BaseException && exception.cause && exception.cause.stack
        ? [`[causeStack: ${exception.cause.stack}]`]
        : []),
    ];

    const logMessage = logParts.join('\n');

    // Log with readable format
    this.logger[logLevel](logMessage);
  }

  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }
}
