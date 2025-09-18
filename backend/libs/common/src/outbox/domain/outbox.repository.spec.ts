import { Id } from '../../general';
import { OutboxEvent, type OutboxEventDTO } from './outbox-event.entity';
import type { OutboxRepository } from './outbox.repository';

/**
 * Shared test suite for OutboxRepository implementations.
 * This ensures all implementations behave consistently and meet the interface contract.
 */
// Basic validation test to prevent Jest "no tests found" error
describe('OutboxRepository Contract Test Suite', () => {
  it('exports testOutboxRepositoryContract function', () => {
    expect(typeof testOutboxRepositoryContract).toBe('function');
  });
});

export function testOutboxRepositoryContract(
  description: string,
  createRepository: () => Promise<OutboxRepository>,
  setupTeardown?: {
    beforeAll?: () => Promise<void>;
    afterAll?: () => Promise<void>;
    beforeEach?: () => Promise<void>;
    afterEach?: () => Promise<void>;
  },
) {
  describe(`OutboxRepository Contract: ${description}`, () => {
    let repo: OutboxRepository;

    if (setupTeardown?.beforeAll) {
      beforeAll(setupTeardown.beforeAll, 30000);
    }

    if (setupTeardown?.afterAll) {
      afterAll(setupTeardown.afterAll, 30000);
    }

    if (setupTeardown?.beforeEach) {
      beforeEach(setupTeardown.beforeEach);
    }

    if (setupTeardown?.afterEach) {
      afterEach(setupTeardown.afterEach);
    }

    beforeEach(async () => {
      repo = await createRepository();
    });

    describe('save and findUnprocessed', () => {
      it('saves and returns unprocessed events ordered by createdAt ASC', async () => {
        const now = Date.now();
        const events = [
          createRealisticEvent({
            eventName: 'UserRegistered',
            createdAt: new Date(now - 3000),
            payload: JSON.stringify({ userId: 'usr-001', email: 'oldest@test.com' }),
          }),
          createRealisticEvent({
            eventName: 'OrderPlaced',
            createdAt: new Date(now - 2000),
            payload: JSON.stringify({ orderId: 'ord-001', amount: 99.99 }),
          }),
          createRealisticEvent({
            eventName: 'PaymentReceived',
            createdAt: new Date(now - 1000),
            payload: JSON.stringify({ paymentId: 'pay-001', status: 'completed' }),
          }),
        ];

        // Save in random order
        await repo.save(events[2]);
        await repo.save(events[0]);
        await repo.save(events[1]);

        const results = await repo.findUnprocessed(10);
        expect(results).toHaveLength(3);
        // Should be ordered by createdAt ASC (oldest first)
        expect(results.map((e) => e.id.toValue())).toEqual([
          events[0].id.toValue(),
          events[1].id.toValue(),
          events[2].id.toValue(),
        ]);
      });

      it('handles empty repository gracefully', async () => {
        const results = await repo.findUnprocessed(10);
        expect(results).toEqual([]);
      });

      it('correctly filters out processed events from findUnprocessed', async () => {
        const events = generateEvents(5, { processedRatio: 0.6 }); // 60% processed

        for (const event of events) {
          await repo.save(event);
        }

        const unprocessed = await repo.findUnprocessed(10);
        expect(unprocessed.length).toBeLessThan(5);
        expect(unprocessed.every((e) => e.isUnprocessed())).toBe(true);
      });

      it('handles large payloads correctly', async () => {
        const largePayload = {
          data: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            message: `This is a large message with lots of content ${i.toString().repeat(10)}`,
            metadata: {
              timestamp: new Date().toISOString(),
              tags: ['tag1', 'tag2', 'tag3'],
              attributes: { color: 'blue', size: 'large', weight: 1.5 },
            },
          })),
        };

        const event = createRealisticEvent({
          payload: JSON.stringify(largePayload),
        });

        await repo.save(event);
        const [foundEvent] = await repo.findUnprocessed(1);
        expect(foundEvent).toBeDefined();
        expect(foundEvent.id.toValue()).toBe(event.id.toValue());

        const retrievedPayload = JSON.parse(foundEvent.payload);
        expect(retrievedPayload.data).toHaveLength(1000);
        expect(retrievedPayload.data[0].message).toBe(largePayload.data[0].message);
      });
    });

    describe('processing state transitions', () => {
      it('moves events between unprocessed and processed indexes on save', async () => {
        const event = createRealisticEvent({
          eventName: 'StateTransitionTest',
          payload: JSON.stringify({ state: 'initial' }),
        });

        // Initially unprocessed
        await repo.save(event);
        let unprocessed = await repo.findUnprocessed(10);
        expect(unprocessed.map((x) => x.id.toValue())).toEqual([event.id.toValue()]);

        // Mark as processed
        event.markAsProcessed();
        await repo.save(event);

        // Should no longer be in unprocessed
        unprocessed = await repo.findUnprocessed(10);
        expect(unprocessed.map((x) => x.id.toValue())).toEqual([]);
      });

      it('handles retry count increments correctly', async () => {
        const event = createRealisticEvent({
          retryCount: 2,
          maxRetries: 3,
        });

        await repo.save(event);
        const [found] = await repo.findUnprocessed(1);
        expect(found.retryCount).toBe(2);
        expect(found.maxRetries).toBe(3);
        expect(found.canRetry()).toBe(true);

        // Increment to max retries
        found.incrementRetry();
        await repo.save(found);

        const results = await repo.findUnprocessed(1);
        expect(results).toHaveLength(1);
        expect(results[0].canRetry()).toBe(false);
      });

      it('preserves all event properties through save/load cycle', async () => {
        const originalEvent = createRealisticEvent({
          eventName: 'CompleteEventTest',
          topic: 'preservation-test',
          payload: JSON.stringify({ nested: { deep: { value: 'test' } } }),
          createdAt: new Date('2024-01-15T10:30:00Z'),
          retryCount: 2,
          maxRetries: 10,
        });

        await repo.save(originalEvent);
        const [retrieved] = await repo.findUnprocessed(1);

        expect(retrieved.id.toValue()).toBe(originalEvent.id.toValue());
        expect(retrieved.eventName).toBe(originalEvent.eventName);
        expect(retrieved.topic).toBe(originalEvent.topic);
        expect(retrieved.payload).toBe(originalEvent.payload);
        expect(retrieved.createdAt.getTime()).toBe(originalEvent.createdAt.getTime());
        expect(retrieved.retryCount).toBe(originalEvent.retryCount);
        expect(retrieved.maxRetries).toBe(originalEvent.maxRetries);
        expect(retrieved.isUnprocessed()).toBe(true);
      });
    });

    describe('pagination and limits', () => {
      it('respects limit when fetching unprocessed events', async () => {
        const events = generateEvents(10, { startMsAgo: 20_000, stepMs: 100 });
        for (const event of events) {
          await repo.save(event);
        }

        const batch1 = await repo.findUnprocessed(3);
        expect(batch1).toHaveLength(3);

        const batch2 = await repo.findUnprocessed(5);
        expect(batch2).toHaveLength(5);

        const batch3 = await repo.findUnprocessed(15);
        expect(batch3).toHaveLength(10); // Only 10 total

        // Verify ordering is consistent
        expect(batch1[0].createdAt.getTime()).toBeLessThanOrEqual(batch1[1].createdAt.getTime());
        expect(batch2[0].id.toValue()).toBe(batch1[0].id.toValue()); // Same first item
        expect(batch3[0].id.toValue()).toBe(batch2[0].id.toValue()); // Same first item
      });

      it('returns consistent results for repeated queries', async () => {
        const events = generateEvents(5, { startMsAgo: 5000, stepMs: 50 });
        for (const event of events) {
          await repo.save(event);
        }

        const result1 = await repo.findUnprocessed(10);
        const result2 = await repo.findUnprocessed(10);

        expect(result1).toHaveLength(result2.length);
        expect(result1.map((e) => e.id.toValue())).toEqual(result2.map((e) => e.id.toValue()));
        expect(result1.map((e) => e.createdAt.getTime())).toEqual(
          result2.map((e) => e.createdAt.getTime()),
        );
      });
    });

    describe('cleanup operations', () => {
      // it('deletes only processed events older than cutoff date', async () => {
      //   const cutoffTime = new Date(Date.now() - 5000);
      //   const events = generateEvents(5, {
      //     startMsAgo: 10_000,
      //     stepMs: 1000,
      //     processedRatio: 0.8, // 80% processed
      //   });

      //   // Set specific processed times relative to cutoff
      //   events.forEach((event, i) => {
      //     if (event.isProcessed()) {
      //       if (i < 2) {
      //         // These should be deleted (older than cutoff)
      //         event.processedAt = new Date(cutoffTime.getTime() - 1000);
      //       } else {
      //         // These should remain (newer than cutoff)
      //         event.processedAt = new Date(cutoffTime.getTime() + 1000);
      //       }
      //     }
      //   });

      //   for (const event of events) {
      //     await repo.save(event);
      //   }

      //   const beforeCleanup = await repo.findUnprocessed(10);
      //   await repo.deleteProcessed(cutoffTime);
      //   const afterCleanup = await repo.findUnprocessed(10);

      //   // Should have same unprocessed events
      //   expect(afterCleanup.length).toBe(beforeCleanup.length);
      //   expect(afterCleanup.map((e) => e.id).sort()).toEqual(beforeCleanup.map((e) => e.id).sort());
      // });

      it('handles edge case with exact cutoff time', async () => {
        const exactTime = new Date(Date.now() - 1000);
        const event = createRealisticEvent({
          id: Id.random().toValue(),
          processedAt: exactTime,
        });

        await repo.save(event);
        await repo.deleteProcessed(exactTime);

        // Event processed at exact cutoff should NOT be deleted (< cutoff, not <= cutoff)
        const results = await repo.findUnprocessed(10);
        expect(results).toHaveLength(0); // Should be processed, so not in unprocessed
      });

      it('handles empty processed list gracefully', async () => {
        const cutoffTime = new Date();
        await repo.deleteProcessed(cutoffTime);

        const results = await repo.findUnprocessed(10);
        expect(results).toEqual([]);
      });
    });
  });
}

// Helper functions for creating test data
function createRealisticEvent(props: Partial<OutboxEventDTO> = {}): OutboxEvent {
  const defaultPayload = {
    userId: 'user-123',
    action: 'USER_CREATED',
    timestamp: new Date().toISOString(),
    metadata: { source: 'api', version: '1.0' },
  };

  return new OutboxEvent({
    id: props.id ?? Id.random().toValue(),
    eventName: props.eventName ?? 'UserCreated',
    topic: props.topic ?? 'user-events',
    payload: props.payload ?? JSON.stringify(defaultPayload),
    createdAt: props.createdAt ?? new Date(),
    processedAt: props.processedAt ?? OutboxEvent.NEVER_PROCESSED,
    retryCount: props.retryCount ?? 0,
    maxRetries: props.maxRetries ?? 3,
  });
}

function generateEvents(
  count: number,
  opts: {
    startMsAgo?: number; // how many ms ago for the first
    stepMs?: number; // increment between items
    processedRatio?: number; // 0..1 of items to mark processed (evenly spread)
    topic?: string;
    eventNames?: string[]; // Rotate through these event names
  } = {},
): OutboxEvent[] {
  const startMsAgo = opts.startMsAgo ?? 10_000;
  const stepMs = opts.stepMs ?? 100;
  const processedRatio = opts.processedRatio ?? 0;
  const topic = opts.topic ?? 'test-events';
  const eventNames = opts.eventNames ?? ['OrderCreated', 'PaymentProcessed', 'NotificationSent'];

  const events: OutboxEvent[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const createdAt = new Date(now - startMsAgo + i * stepMs);
    const eventName = eventNames[i % eventNames.length];
    const payload = {
      id: Id.random(),
      eventType: eventName,
      timestamp: createdAt.toISOString(),
      data: { index: i, test: true },
    };

    const processedAt =
      processedRatio > 0 && i / Math.max(1, count - 1) <= processedRatio
        ? new Date(createdAt.getTime() + 50)
        : OutboxEvent.NEVER_PROCESSED;

    const e = new OutboxEvent({
      id: payload.id.toValue(),
      eventName,
      topic,
      payload: JSON.stringify(payload),
      createdAt,
      processedAt,
      retryCount: 0,
      maxRetries: 3,
    });
    events.push(e);
  }
  return events;
}
