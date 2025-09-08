import { Logger as NestLogger, type LoggerService } from '@nestjs/common';

import { TracingService } from '../tracing/tracing.service';

type LogMessage = string | number | boolean | object | Error;

export class CorrelationLogger extends NestLogger implements LoggerService {
  constructor(context?: string) {
    super(context || 'CorrelationLogger');
  }

  private prefix(): string {
    const correlationId = TracingService.getCorrelationId() ?? 'none';
    return `[${correlationId}]`;
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

  log(message: LogMessage, ...optionalParams: []) {
    super.log(`${this.prefix()} ${this.toString(message)}`, ...optionalParams);
  }

  error(message: LogMessage, traceOrError?: string | Error) {
    if (traceOrError instanceof Error) {
      super.error(`${this.prefix()} ${this.toString(message)}`, traceOrError.stack);
    } else {
      super.error(`${this.prefix()} ${this.toString(message)}`, traceOrError);
    }
  }

  warn(message: LogMessage, ...optionalParams: []) {
    super.warn(`${this.prefix()} ${this.toString(message)}`, ...optionalParams);
  }

  debug(message: LogMessage, ...optionalParams: []) {
    super.debug(`${this.prefix()} ${this.toString(message)}`, ...optionalParams);
  }

  verbose(message: LogMessage, ...optionalParams: []) {
    super.verbose(`${this.prefix()} ${this.toString(message)}`, ...optionalParams);
  }
}
