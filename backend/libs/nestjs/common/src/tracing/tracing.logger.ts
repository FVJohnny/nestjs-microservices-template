import { Logger, LoggerService } from '@nestjs/common';
import { TracingService } from './tracing.service';

export class TracingLogger extends Logger implements LoggerService {
  constructor(context?: string) {
    super(context || 'TracingLogger');
  }

  private formatMessage(message: any): string {
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

  log(message: any) {
    super.log(this.formatMessage(message));
  }

  error(message: any, errorOrTrace?: string | Error) {
    // Handle Error objects directly
    if (errorOrTrace instanceof Error) {
      const errorMessage = `${message}: ${errorOrTrace.message}`;
      super.error(this.formatMessage(errorMessage), errorOrTrace.stack);
    } else {
      super.error(this.formatMessage(message), errorOrTrace);
    }
  }

  warn(message: any) {
    super.warn(this.formatMessage(message));
  }

  debug(message: any) {
    super.debug(this.formatMessage(message));
  }

  verbose(message: any) {
    super.verbose(this.formatMessage(message));
  }
}
