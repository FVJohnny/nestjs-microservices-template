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