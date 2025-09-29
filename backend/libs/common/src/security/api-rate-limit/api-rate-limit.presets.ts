import { RateLimit } from './api-rate-limit.decorator';

export const StandardRateLimit = () =>
  RateLimit({
    '1second': { type: 'ip', limit: 3 },
    '1minute': { type: 'ip', limit: 10 },
  });

export const RelaxedRateLimit = () =>
  RateLimit({
    '1second': { type: 'ip', limit: 10 },
    '1minute': { type: 'ip', limit: 100 },
  });

export const StrictRateLimit = () =>
  RateLimit({
    '1second': { type: 'ip', limit: 1 },
    '1minute': { type: 'ip', limit: 5 },
    '1hour': { type: 'ip', limit: 50 },
  });
