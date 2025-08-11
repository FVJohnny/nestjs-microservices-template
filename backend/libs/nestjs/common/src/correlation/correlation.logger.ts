import { Logger, LoggerService } from '@nestjs/common';
import { CorrelationService } from './correlation.service';

export class CorrelationLogger extends Logger implements LoggerService {
  constructor(context?: string) {
    super(context || 'CorrelationLogger');
  }

  private formatMessage(message: any): string {
    const correlationId = CorrelationService.getCorrelationId();
    const context = CorrelationService.getContext();
    
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

  error(message: any, trace?: string) {
    super.error(this.formatMessage(message), trace);
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
