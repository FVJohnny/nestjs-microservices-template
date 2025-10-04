import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

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
      const traceId = TracingService.getTraceId();
      if (traceId && !res.headersSent) {
        res.setHeader('x-trace-id', traceId);
      }
      return originalWriteHead.apply(this, args);
    };

    next();
  }
}
