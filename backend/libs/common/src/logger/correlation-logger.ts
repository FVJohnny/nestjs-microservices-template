/* eslint-disable @typescript-eslint/no-explicit-any */
import { type LoggerService } from '@nestjs/common';
import { hostname } from 'os';

import { TracingService } from '../tracing/tracing.service';

type LogMessage = string | number | boolean | object | Error;

export class CorrelationLogger implements LoggerService {
  private logLevel: string;
  private service: string;
  private environment: string;
  private hostname: string;
  private context: string;

  constructor(context: string) {
    this.context = context;
    this.logLevel = process.env.LOG_LEVEL || 'debug';
    this.service = process.env.SERVICE_NAME || 'unknown-service';
    this.environment = process.env.NODE_ENV || 'development';
    // Prefer k8s pod name, fallback to OS hostname, then env var
    this.hostname = process.env.POD_NAME || hostname() || process.env.HOSTNAME || 'unknown-host';
  }

  log = (message: LogMessage) => {
    if (!this.shouldLog('log')) return;

    console.log(this.toJsonLog('info', message));
  };

  error = (message: LogMessage, traceOrError?: string | Error) => {
    if (!this.shouldLog('error')) return;

    console.error(
      this.toJsonLog('error', message, traceOrError instanceof Error ? traceOrError : undefined),
    );
  };

  warn = (message: LogMessage) => {
    if (!this.shouldLog('warn')) return;

    console.warn(this.toJsonLog('warn', message));
  };

  debug = (message: LogMessage) => {
    if (!this.shouldLog('debug')) return;

    console.debug(this.toJsonLog('debug', message));
  };

  private shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'log', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex <= currentLevelIndex;
  }

  private toJsonLog(level: string, message: LogMessage, error?: Error): string {
    const traceMetadata = TracingService.getTraceMetadata();

    const logObject: Record<string, any> = {
      timestamp: new Date().toISOString(),
      level,
      message: this.convertToString(message),
      context: this.context,
      service: this.service,
      environment: this.environment,
      hostname: this.hostname,
      ...(traceMetadata && {
        traceId: traceMetadata.traceId,
        spanId: traceMetadata.spanId,
      }),
    };

    // Add error details if present
    if (error) {
      logObject.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };

      // Include custom error properties (like code, statusCode, etc.)
      Object.keys(error).forEach((key) => {
        if (!['name', 'message', 'stack'].includes(key)) {
          logObject.error[key] = (error as any)[key];
        }
      });
    }

    return JSON.stringify(logObject);
  }

  private convertToString(message: LogMessage): string {
    if (message instanceof Error) return message.message;
    if (typeof message === 'string') return message;
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}
