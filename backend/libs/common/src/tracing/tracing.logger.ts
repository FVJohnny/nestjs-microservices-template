import { Logger, type LoggerService } from '@nestjs/common';

import { TracingService } from './tracing.service';

type LogMessage = string | number | boolean | object | Error;

export class TracingLogger extends Logger implements LoggerService {
  constructor(context?: string) {
    super(context || 'TracingLogger');
  }

  private formatMessage(message: LogMessage): string {
    const correlationId = TracingService.getCorrelationId();
    const context = TracingService.getContext();
    
    const prefix = correlationId ? `[${correlationId}]` : '';
    const userInfo = context?.userId ? `[UserId: ${context.userId}]` : '';

    
    const contextWithoutCorrelationId = { ...context };
    delete contextWithoutCorrelationId.correlationId;

    const contextText = 
      Object.keys(contextWithoutCorrelationId).length > 0
        ? `[Context: ${JSON.stringify(contextWithoutCorrelationId)}]`
        : '';
    
    return `${prefix}${userInfo} ${message}.  ${contextText}`;
  }

  log(message: LogMessage) {
    super.log(this.formatMessage(message));
  }

  error(message: LogMessage, errorOrTrace?: string | Error) {
    // Handle Error objects directly
    if (errorOrTrace instanceof Error) {
      const errorMessage = `${String(message)}: ${errorOrTrace.message}`;
      super.error(this.formatMessage(errorMessage), errorOrTrace.stack);
    } else {
      super.error(this.formatMessage(message), errorOrTrace);
    }
  }

  warn(message: LogMessage) {
    super.warn(this.formatMessage(message));
  }

  debug(message: LogMessage) {
    super.debug(this.formatMessage(message));
  }

  verbose(message: LogMessage) {
    super.verbose(this.formatMessage(message));
  }
}
