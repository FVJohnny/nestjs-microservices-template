import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface CorrelationContext {
  correlationId: string;
  userId?: string;
  requestId?: string;
}

@Injectable()
export class CorrelationService {
  private static asyncLocalStorage = new AsyncLocalStorage<CorrelationContext>();

  static getCorrelationId(): string | undefined {
    const context = this.asyncLocalStorage.getStore();
    return context?.correlationId;
  }

  static getContext(): CorrelationContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  static generateCorrelationId(): string {
    return randomUUID();
  }

  static runWithContext<T>(context: CorrelationContext, callback: () => T): T {
    return this.asyncLocalStorage.run(context, callback);
  }

  static setContext(context: Partial<CorrelationContext>): void {
    const currentContext = this.asyncLocalStorage.getStore();
    if (currentContext) {
      Object.assign(currentContext, context);
    }
  }
}
