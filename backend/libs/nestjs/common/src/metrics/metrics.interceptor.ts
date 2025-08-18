import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<any>();
    const res = httpCtx.getResponse<any>();

    const method = (req?.method || 'GET').toUpperCase();
    const route = (req?.route?.path || req?.originalUrl || req?.url || 'unknown')
      .replace(/[0-9a-fA-F-]{8,}/g, ':id');

    const endTimer = this.metrics.startHttpRequestTimer({ method, route });

    const start = process.hrtime.bigint();
    return next.handle().pipe(
      tap({
        next: () => {
          const status = res?.statusCode || 200;
          endTimer({ status_code: String(status) } as any);
          const end = process.hrtime.bigint();
          const durationSeconds = Number(end - start) / 1e9;
          this.metrics.observeHttpRequest({ method, route, status_code: status }, durationSeconds);
        },
        error: () => {
          const status = res?.statusCode || 500;
          endTimer({ status_code: String(status) } as any);
          const end = process.hrtime.bigint();
          const durationSeconds = Number(end - start) / 1e9;
          this.metrics.observeHttpRequest({ method, route, status_code: status }, durationSeconds);
        },
      })
    );
  }
}
