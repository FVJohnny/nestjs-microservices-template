import { EventBus } from '@nestjs/cqrs';

/**
 * Makes the provided EventBus throw on publish/publishAll.
 */
export function mockEventBusPublishFailure(
  eventBus: Pick<EventBus, 'publish' | 'publishAll'>,
  error: Error | string = 'fail',
) {
  const err = typeof error === 'string' ? new Error(error) : error;

  // Fallback: direct override
  (eventBus as any).publish = () => {
    throw err;
  };
  (eventBus as any).publishAll = () => {
    throw err;
  };
}
