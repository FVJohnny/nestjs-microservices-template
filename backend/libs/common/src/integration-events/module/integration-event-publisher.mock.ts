import type { IntegrationEventPublisher } from './event-publisher.interface';

export interface MockIntegrationEventPublisher extends IntegrationEventPublisher {
  publishedEvents: Array<{ topic: string; message: string }>;
}

/**
 * Creates a mock IntegrationEventPublisher for testing purposes
 *
 * @param options Configuration options for the mock
 * @param options.shouldFail If true, publish methods will throw errors
 * @returns MockIntegrationEventPublisher instance with captured events and configurable failure behavior
 */
export function createIntegrationEventPublisherMock(options: {
  shouldFail: boolean;
}): MockIntegrationEventPublisher {
  const publishedEvents: Array<{ topic: string; message: string }> = [];

  // Create mock functions without jest dependency
  const publishMock = (topic: string, message: string) => {
    if (options.shouldFail) {
      throw new Error('IntegrationEventPublisher publish failed');
    }
    publishedEvents.push({ topic, message });
    return Promise.resolve();
  };

  const mockPublisher: MockIntegrationEventPublisher = {
    publishedEvents,
    publish: publishMock,
  };

  return mockPublisher;
}