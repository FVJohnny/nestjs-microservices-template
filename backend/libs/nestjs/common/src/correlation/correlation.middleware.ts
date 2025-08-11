import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CorrelationService } from './correlation.service';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Get correlation ID from header or generate a new one
    const correlationId = 
      req.headers['x-correlation-id'] as string || 
      req.headers['correlation-id'] as string ||
      CorrelationService.generateCorrelationId();

    // Set correlation ID in response header
    res.setHeader('x-correlation-id', correlationId);

    // Run the request within the correlation context
    CorrelationService.runWithContext(
      {
        correlationId,
        requestId: req.headers['x-request-id'] as string,
        userId: req.headers['x-user-id'] as string
      },
      () => next()
    );
  }
}
