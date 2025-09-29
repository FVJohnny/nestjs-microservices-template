/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger as NestLogger, type LoggerService } from '@nestjs/common';

import { TracingService } from '../tracing/tracing.service';

type LogMessage = string | number | boolean | object | Error;

export class CorrelationLogger extends NestLogger implements LoggerService {
  private logLevel: string;

  constructor(context?: string) {
    super(context || 'CorrelationLogger');
    this.logLevel = process.env.LOG_LEVEL || 'debug';
  }

  log = (message: LogMessage, ...optionalParams: any[]) => {
    if (this.shouldLog('log')) {
      super.log(`${this.prefix()} ${this.formatMessage(message, optionalParams)}`);
    }
  };

  error = (message: LogMessage, traceOrError?: string | Error, ...optionalParams: any[]) => {
    if (this.shouldLog('error')) {
      if (traceOrError instanceof Error) {
        super.error(
          `${this.prefix()} ${this.formatMessage(message, optionalParams)}`,
          traceOrError.stack,
        );
      } else {
        super.error(
          `${this.prefix()} ${this.formatMessage(message, optionalParams)}`,
          traceOrError,
        );
      }
    }
  };

  warn = (message: LogMessage, ...optionalParams: any[]) => {
    if (this.shouldLog('warn')) {
      super.warn(`${this.prefix()} ${this.formatMessage(message, optionalParams)}`);
    }
  };

  debug = (message: LogMessage, ...optionalParams: any[]) => {
    if (this.shouldLog('debug')) {
      super.debug(`${this.prefix()} ${this.formatMessage(message, optionalParams)}`);
    }
  };

  verbose = (message: LogMessage, ...optionalParams: any[]) => {
    if (this.shouldLog('verbose')) {
      super.verbose(`${this.prefix()} ${this.toString(message)}`, ...optionalParams);
    }
  };

  private shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'log', 'debug', 'verbose'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex <= currentLevelIndex;
  }

  private prefix(): string {
    const metadata = TracingService.getTracingMetadata();
    const idLog = metadata?.id ? `[ID: ${metadata?.id}] ` : '';
    const correlationIdLog = metadata?.correlationId
      ? `[CorrelationIDDDD: ${metadata?.correlationId}] `
      : '';
    const causationIdLog = metadata?.causationId ? `[CausationID: ${metadata?.causationId}] ` : '';

    return `${idLog}${correlationIdLog}${causationIdLog}`;
  }

  private toString(message: LogMessage): string {
    if (message instanceof Error) return message.message;
    if (typeof message === 'string') return message;
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  private formatMessage(message: LogMessage, optionalParams: any[]): string {
    return `${this.toString(message)} ${optionalParams.map((p) => this.toString(p)).join('\n')}`;
  }
}
