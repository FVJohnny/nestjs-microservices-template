import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction,Request, Response } from 'express';

import { TracingService } from './tracing.service';

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Get correlation ID from header or generate a new one
    const correlationId = 
      req.headers['x-correlation-id'] as string || 
      req.headers['correlation-id'] as string ||
      TracingService.generateCorrelationId();

    // Set correlation ID in response header
    res.setHeader('x-correlation-id', correlationId);

    // Run the request within the correlation context
    TracingService.runWithContext(
      {
        correlationId,
        requestId: req.headers['x-request-id'] as string,
        userId: req.headers['x-user-id'] as string
      },
      () => next()
    );
  }
}
