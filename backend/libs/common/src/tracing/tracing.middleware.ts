import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import { TracingService } from './tracing.service';

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] as string;
    const id = req.headers['x-tracing-id'] as string;

    const tracingMetadata = TracingService.createTracingMetadata({ id, correlationId });
    // Set correlation ID in response header

    res.setHeader('x-correlation-id', tracingMetadata.correlationId);
    res.setHeader('x-tracing-id', tracingMetadata.id);

    // Run the request within the correlation context
    TracingService.runWithMetadata(tracingMetadata, () => next());
  }
}
