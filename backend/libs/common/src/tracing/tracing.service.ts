import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface TracingMetadata {
  id: string;
  correlationId: string;
  causationId?: string;
  userId?: string;
  requestId?: string;
}

@Injectable()
export class TracingService {
  private static asyncLocalStorage = new AsyncLocalStorage<TracingMetadata>();

  static getTracingMetadata(): TracingMetadata | undefined {
    return this.asyncLocalStorage.getStore();
  }

  static createTracingMetadata(otherMetadata?: TracingMetadata): TracingMetadata {
    const id = randomUUID();
    const correlationId = otherMetadata?.correlationId || id;
    const causationId = correlationId !== id ? otherMetadata?.id : undefined;
    return {
      id,
      correlationId,
      causationId,
    };
  }

  static runWithMetadata<T>(context: TracingMetadata, callback: () => T): T {
    return this.asyncLocalStorage.run(context, callback);
  }

  static runWithNewMetadataFrom<T>(metadata: TracingMetadata, callback: () => T): T {
    const newMetadata = this.createTracingMetadata(metadata);
    return this.runWithMetadata(newMetadata, callback);
  }

  static runWithNewMetadata<T>(callback: () => T): T {
    const oldMetadata = this.getTracingMetadata();
    const metadata = this.createTracingMetadata(oldMetadata);
    return this.runWithMetadata(metadata, callback);
  }
}
