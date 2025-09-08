import type { DomainEvent } from '../general';
import type { IntegrationEventPublisher } from '../integration-events';

export interface MockEventBus {
  events: DomainEvent[];
  shouldFail: boolean;
  publish: (event: DomainEvent) => Promise<void>;
  publishAll: (events: DomainEvent[]) => Promise<void>;
  bind?: () => void;
  combine?: () => void;
  ofType?: () => void;
  pipe?: () => void;
  subscribe?: () => void;
}

export interface CreateEventBusMockOptions {
  shouldFail?: boolean;
}

/**
 * Creates a mock EventBus for testing purposes
 *
 * @param options Configuration options for the mock
 * @param options.shouldFail If true, publish/publishAll methods will throw errors
 * @returns MockEventBus instance with captured events and configurable failure behavior
 */
export function createEventBusMock(options: CreateEventBusMockOptions = {}): MockEventBus {
  const { shouldFail = false } = options;

  const events: DomainEvent[] = [];

  // Create mock functions without jest dependency
  const publishMock = (event: DomainEvent) => {
    if (shouldFail) {
      throw new Error('EventBus publish failed');
    }
    events.push(event);
    return Promise.resolve();
  };

  const publishAllMock = (eventArray: DomainEvent[]) => {
    if (shouldFail) {
      throw new Error('EventBus publishAll failed');
    }
    events.push(...eventArray);
    return Promise.resolve();
  };

  const mockEventBus: MockEventBus = {
    events,
    shouldFail,
    publish: publishMock,
    publishAll: publishAllMock,
    // Add other EventBus methods as no-ops if needed
    bind: () => {},
    combine: () => {},
    ofType: () => {},
    pipe: () => {},
    subscribe: () => {},
  };

  return mockEventBus;
}

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
