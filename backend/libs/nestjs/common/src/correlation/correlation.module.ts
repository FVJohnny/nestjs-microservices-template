import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { CorrelationMiddleware } from './correlation.middleware';
import { CorrelationService } from './correlation.service';

@Module({
  providers: [CorrelationService],
  exports: [CorrelationService],
})
export class CorrelationModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
