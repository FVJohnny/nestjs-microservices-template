import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

import { TracingService } from './tracing.service';

/**
 * Middleware that adds trace context to response headers
 * OpenTelemetry auto-instrumentation handles trace propagation
 */
@Injectable()
export class TracingMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction) {
    // Intercept writeHead to set trace ID header before response is sent
    const originalWriteHead = res.writeHead;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.writeHead = function (this: Response, ...args: any[]) {
      const traceMetadata = TracingService.getTraceMetadata();
      if (traceMetadata && !res.headersSent) {
        res.setHeader('x-trace-id', traceMetadata.traceId);
        res.setHeader('x-span-id', traceMetadata.spanId);
      }
      return originalWriteHead.apply(this, args);
    };

    next();
  }
}
