import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';
import { AuditLog } from './audit-log.interface';
import { CorrelationService } from '../correlation/correlation.service';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(
    private readonly auditService: AuditService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!this.auditService.shouldLog(req.path)) {
      return next();
    }

    const startTime = Date.now();
    const correlationId = CorrelationService.getCorrelationId() || 'no-correlation-id';

    // Log request arrival immediately
    const requestLog: AuditLog = {
      correlationId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: this.getClientIp(req),
      userId: this.extractUserId(req),
      requestHeaders: this.filterHeaders(req.headers),
      requestBody: this.getRequestBody(req),
      timestamp: new Date(),
    };

    // Log request arrival immediately
    await this.auditService.logRequest(requestLog);

    // Intercept response
    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody: any;
    let responseCaptured = false;

    // Override res.send
    res.send = function (body: any) {
      if (!responseCaptured) {
        responseBody = body;
        responseCaptured = true;
      }
      return originalSend.call(this, body);
    };

    // Override res.json
    res.json = function (body: any) {
      if (!responseCaptured) {
        responseBody = body;
        responseCaptured = true;
      }
      return originalJson.call(this, body);
    };

    // Log response when finished
    res.on('finish', async () => {
      const responseLog: AuditLog = {
        ...requestLog,
        responseStatus: res.statusCode,
        responseHeaders: this.filterHeaders(res.getHeaders()),
        responseBody: responseBody,
        duration: Date.now() - startTime,
      };

      if (res.statusCode >= 400) {
        responseLog.error = `HTTP ${res.statusCode} ${res.statusMessage}`;
      }

      await this.auditService.logResponse(responseLog);
    });

    next();
  }

  private getClientIp(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }

  private extractUserId(req: Request): string | undefined {
    // Try to extract user ID from various sources
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        // This is a simplified extraction - in real apps you'd decode JWT
        const token = authHeader.substring(7);
        // For now, just return a placeholder
        return 'user-from-token';
      } catch (error) {
        // Token parsing failed
      }
    }

    // Check for user in request object (if set by auth middleware)
    const user = (req as any).user;
    return user?.id || user?.userId || user?.sub;
  }

  private filterHeaders(headers: any): Record<string, any> {
    const filtered = { ...headers };
    
    // Remove or redact sensitive headers
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    for (const header of sensitiveHeaders) {
      if (filtered[header]) {
        filtered[header] = '[REDACTED]';
      }
    }
    
    return filtered;
  }

  private getRequestBody(req: Request): any {
    // The body should already be parsed by body-parser middleware
    return req.body;
  }
}