import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { TracingModule } from '../tracing/tracing.module';
import { AuditMiddleware } from './audit.middleware';
import { AuditService } from './audit.service';

@Module({
  imports: [TracingModule],
  providers: [AuditService, AuditMiddleware],
  exports: [AuditService],
})
export class AuditModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditMiddleware).forRoutes('*');
  }
}