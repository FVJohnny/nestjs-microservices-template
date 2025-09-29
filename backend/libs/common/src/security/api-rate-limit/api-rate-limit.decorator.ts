import { Throttle } from '@nestjs/throttler';
import type { RateLimitOptions } from './api-rate-limit.types';
import { rateLimitOptionsToThrottlerOptions } from './api-rate-limit.utils';

export const RATE_LIMIT_KEY = 'rate_limit';

/**
 * Custom rate limit decorator that supports multiple time-based configurations
 * @param options - Rate limit configuration with time keys and limits
 * @example
 * @RateLimit({
 *   '1minute': { type: 'ip', limit: 10 },
 *   '1hour': { type: 'ip', limit: 100 }
 * })
 */
export function RateLimit(options: RateLimitOptions) {
  const throttlerOptions = rateLimitOptionsToThrottlerOptions(options);
  return Throttle(throttlerOptions);
}
