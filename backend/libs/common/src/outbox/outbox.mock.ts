import { OutboxEvent } from './outbox-event.entity';

export interface MockOutboxService {
  storedEvents: Array<OutboxEvent>;
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
let _seq = 0;

export function createOutboxServiceMock(
  options: CreateOutboxServiceMockOptions = {},
): MockOutboxService {
  const { shouldFail = false } = options;

  const storedEvents: Array<OutboxEvent> = [];

  const storeEventMock = (eventType: string, topic: string, payload: string) => {
    if (shouldFail) {
      throw new Error('OutboxService storeEvent failed');
    }
    storedEvents.push(
      new OutboxEvent({
        id: `event_id_${_seq++}`,
        eventName: eventType,
        topic,
        payload,
        createdAt: new Date(),
        processedAt: OutboxEvent.NEVER_PROCESSED,
        retryCount: 0,
        maxRetries: 3,
      }),
    );
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
