import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { RateLimitOptions } from './api-rate-limit.types';
import { rateLimitOptionsToThrottlerArray } from './api-rate-limit.utils';

/**
 * API Rate Limiting Module
 *
 * Provides flexible time-based rate limiting for APIs.
 * Import this module in your app.module.ts to enable rate limiting.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     ApiRateLimitModule.forRoot({
 *       '1minute': { type: 'ip', limit: 100 },
 *       '1hour': { type: 'ip', limit: 1000 }
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class ApiRateLimitModule {
  static forRoot(options: RateLimitOptions) {
    const throttlerConfigs = rateLimitOptionsToThrottlerArray(options);

    return {
      module: ApiRateLimitModule,
      imports: [ThrottlerModule.forRoot(throttlerConfigs)],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
      exports: [ThrottlerModule],
    };
  }
}
