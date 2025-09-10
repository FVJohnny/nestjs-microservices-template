export interface MockOutboxService {
  storedEvents: Array<{ eventType: string; topic: string; payload: string }>;
  shouldFail: boolean;
  storeEvent: (eventType: string, topic: string, payload: string) => Promise<void>;
  processOutboxEvents: () => Promise<void>;
  cleanupProcessedEvents: (cutoffDate: Date) => Promise<void>;
}

export interface CreateOutboxServiceMockOptions {
  shouldFail?: boolean;
}

/**
 * Creates a mock OutboxService for testing purposes
 *
 * @param options Configuration options for the mock
 * @param options.shouldFail If true, storeEvent method will throw errors
 * @returns MockOutboxService instance with captured events and configurable failure behavior
 */
export function createOutboxServiceMock(
  options: CreateOutboxServiceMockOptions = {},
): MockOutboxService {
  const { shouldFail = false } = options;

  const storedEvents: Array<{ eventType: string; topic: string; payload: string }> = [];

  const storeEventMock = (eventType: string, topic: string, payload: string) => {
    if (shouldFail) {
      throw new Error('OutboxService storeEvent failed');
    }
    storedEvents.push({ eventType, topic, payload });
    return Promise.resolve();
  };

  const processOutboxEventsMock = () => {
    if (shouldFail) {
      throw new Error('OutboxService processOutboxEvents failed');
    }
    return Promise.resolve();
  };

  const cleanupProcessedEventsMock = () => {
    if (shouldFail) {
      throw new Error('OutboxService cleanupProcessedEvents failed');
    }
    return Promise.resolve();
  };

  const mockOutboxService: MockOutboxService = {
    storedEvents,
    shouldFail,
    storeEvent: storeEventMock,
    processOutboxEvents: processOutboxEventsMock,
    cleanupProcessedEvents: cleanupProcessedEventsMock,
  };

  return mockOutboxService;
}