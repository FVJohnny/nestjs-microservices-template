import { IntegrationEventPublisher } from "../integration-events";

export interface MockEventBus {
  events: any[];
  shouldFail: boolean;
  publish: any;
  publishAll: any;
  bind?: any;
  combine?: any;
  ofType?: any;
  pipe?: any;
  subscribe?: any;
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
  
  const events: any[] = [];
  
  // Create mock functions without jest dependency
  const publishMock = (event: any) => {
    if (shouldFail) {
      throw new Error('EventBus publish failed');
    }
    events.push(event);
    return Promise.resolve();
  };
  
  const publishAllMock = (eventArray: any[]) => {
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

/**
 * Creates a failing EventBus mock for testing error scenarios
 * 
 * @returns MockEventBus that will throw errors on publish operations
 */
export function createFailingEventBusMock(): MockEventBus {
  return createEventBusMock({ shouldFail: true });
}

/**
 * Creates a successful EventBus mock for testing happy path scenarios
 * 
 * @returns MockEventBus that will successfully capture published events
 */
export function createSuccessfulEventBusMock(): MockEventBus {
  return createEventBusMock({ shouldFail: false });
}

export interface MockIntegrationEventPublisher extends IntegrationEventPublisher {
  publishedEvents: Array<{ topic: string; message: any }>;
}


/**
 * Creates a mock IntegrationEventPublisher for testing purposes
 * 
 * @param options Configuration options for the mock
 * @param options.shouldFail If true, publish methods will throw errors
 * @returns MockIntegrationEventPublisher instance with captured events and configurable failure behavior
 */
export function createIntegrationEventPublisherMock(
  options: { shouldFail: boolean }
): MockIntegrationEventPublisher {
  
  const publishedEvents: Array<{ topic: string; message: any }> = [];
  
  // Create mock functions without jest dependency
  const publishMock = (topic: string, message: any) => {
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