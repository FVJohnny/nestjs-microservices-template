import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditMiddleware } from './audit.middleware';
import { TracingModule } from '../tracing/tracing.module';

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