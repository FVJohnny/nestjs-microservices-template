import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseException } from './base.exception';
import { TracingService } from '../tracing/tracing.service';

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
    metadata?: Record<string, any>;
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
  private readonly logger = new Logger(GlobalExceptionFilter.name);

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
        ...(this.shouldIncludeStack() && { stack: exception.stack }),
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
    const response = exception.getResponse();
    
    // Extract message from NestJS exception response
    const message = typeof response === 'string' 
      ? response 
      : (response as any)?.message || exception.message;

    return {
      success: false,
      error: {
        code: `HTTP_${status}`,
        message: Array.isArray(message) ? message.join(', ') : message,
        timestamp,
        path,
        ...(correlationId && { correlationId }),
        ...(this.shouldIncludeStack() && { stack: exception.stack }),
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
        message: this.isProduction() 
          ? 'An unexpected error occurred' 
          : error.message,
        timestamp,
        path,
        ...(correlationId && { correlationId }),
        ...(this.shouldIncludeStack() && { stack: error.stack }),
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
      ...(exception instanceof BaseException && exception.metadata ? [`[metadata: ${JSON.stringify(exception.metadata)}]`] : []),
      
      ...(this.shouldIncludeStack() && error.stack ? [`[stack: ${error.stack}]`] : []),
    ];

    const logMessage = logParts.join('\n');
    
    // Log with readable format
    this.logger[logLevel](logMessage);
    
  }

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private shouldIncludeStack(): boolean {
    return !this.isProduction();
  }
}