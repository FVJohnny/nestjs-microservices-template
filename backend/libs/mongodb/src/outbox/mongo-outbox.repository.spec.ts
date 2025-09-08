import { MongoOutboxRepository } from './mongo-outbox.repository';
import { OutboxEvent } from '@libs/nestjs-common';
import type { Db } from 'mongodb';
import { MongoClient } from 'mongodb';
import type { MongoDBConfigService } from '../mongodb-config.service';

describe('MongoOutboxRepository', () => {
  let mongoClient: MongoClient;
  let db: Db;
  let repo: MongoOutboxRepository;
  let configService: MongoDBConfigService;
  let createRealisticEvent: ReturnType<typeof createRealisticEventFactory>;
  let generateEvents: ReturnType<typeof generateEventsFactory>;

  // Use existing MongoDB instance from docker-compose
  const TEST_DB_NAME = 'outbox_test_db';
  const MONGODB_URI =
    process.env.MONGODB_URI ||
    `mongodb://admin:admin123@localhost:27017/${TEST_DB_NAME}?authSource=admin`;

  beforeAll(async () => {
    // Connect to existing MongoDB instance
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();

    // Test connection
    await mongoClient.db().admin().ping();

    db = mongoClient.db(TEST_DB_NAME);

    // Setup config service mock
    configService = {
      getDatabaseName: jest.fn().mockReturnValue(TEST_DB_NAME),
    } as unknown as MongoDBConfigService;

    // Create repository instance
    repo = new MongoOutboxRepository(mongoClient, configService);
    await repo.onModuleInit();

    // Initialize helper functions
    createRealisticEvent = createRealisticEventFactory();
    generateEvents = generateEventsFactory();
  }, 30000);

  afterEach(async () => {
    // Clean up the collection after each test
    const collection = db.collection('outbox_events');
    await collection.deleteMany({});
  });

  afterAll(async () => {
    try {
      await mongoClient?.db(TEST_DB_NAME).dropDatabase();
    } catch (error) {
      console.error('Error cleaning up test database:', error);
    }
    await mongoClient?.close();
  }, 30000);

  describe('save and findUnprocessed', () => {
    it('saves and returns unprocessed events ordered by createdAt ASC', async () => {
      const now = Date.now();
      const events = [
        createRealisticEvent({
          id: 'evt-oldest',
          eventName: 'UserRegistered',
          createdAt: new Date(now - 3000),
          payload: { userId: 'usr-001', email: 'oldest@test.com' },
        }),
        createRealisticEvent({
          id: 'evt-middle',
          eventName: 'OrderPlaced',
          createdAt: new Date(now - 2000),
          payload: { orderId: 'ord-001', amount: 99.99 },
        }),
        createRealisticEvent({
          id: 'evt-newest',
          eventName: 'PaymentReceived',
          createdAt: new Date(now - 1000),
          payload: { paymentId: 'pay-001', status: 'completed' },
        }),
      ];

      // Save in random order
      await repo.save(events[2]);
      await repo.save(events[0]);
      await repo.save(events[1]);

      const found = await repo.findUnprocessed(10);
      expect(found).toHaveLength(3);
      expect(found.map((e) => e.id)).toEqual(['evt-oldest', 'evt-middle', 'evt-newest']);

      // Verify event integrity
      expect(found[0].eventName).toBe('UserRegistered');
      expect(JSON.parse(found[0].payload).email).toBe('oldest@test.com');
    });

    it('handles empty repository gracefully', async () => {
      const found = await repo.findUnprocessed(10);
      expect(found).toHaveLength(0);
      expect(found).toEqual([]);
    });

    it('correctly filters out processed events from findUnprocessed', async () => {
      const events = generateEvents(5, {
        processedRatio: 0.6, // First 3 will be processed
        eventNames: ['OrderCreated', 'OrderShipped', 'OrderDelivered'],
      });

      for (const e of events) {
        await repo.save(e);
      }

      const unprocessed = await repo.findUnprocessed(10);
      expect(unprocessed).toHaveLength(2);
      expect(unprocessed.every((e) => e.isUnprocessed())).toBe(true);
      // The last 2 events (indices 3 and 4) should be unprocessed
      const unprocessedIds = unprocessed.map((e) => e.id);
      expect(unprocessedIds.some((id) => id.includes('evt-3'))).toBe(true);
      expect(unprocessedIds.some((id) => id.includes('evt-4'))).toBe(true);
    });

    it('handles large payloads correctly', async () => {
      const largePayload = {
        data: Array(100)
          .fill(null)
          .map((_, i) => ({
            id: i,
            name: `Item ${i}`,
            description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit'.repeat(10),
            metadata: {
              created: new Date().toISOString(),
              tags: ['tag1', 'tag2', 'tag3'],
              attributes: { color: 'blue', size: 'large', weight: 1.5 },
            },
          })),
      };

      const event = createRealisticEvent({
        id: 'evt-large',
        payload: largePayload,
      });

      await repo.save(event);
      const found = await repo.findUnprocessed(1);
      expect(found).toHaveLength(1);
      expect(found[0].id).toBe('evt-large');

      const retrievedPayload = JSON.parse(found[0].payload);
      expect(retrievedPayload.data).toHaveLength(100);
      expect(retrievedPayload.data[0].name).toBe('Item 0');
    });

    it('handles upsert correctly when saving duplicate IDs', async () => {
      const event1 = createRealisticEvent({
        id: 'evt-duplicate',
        eventName: 'FirstVersion',
        payload: { version: 1 },
      });

      const event2 = createRealisticEvent({
        id: 'evt-duplicate',
        eventName: 'SecondVersion',
        payload: { version: 2 },
      });

      await repo.save(event1);
      await repo.save(event2);

      const found = await repo.findUnprocessed(10);
      expect(found).toHaveLength(1);
      expect(found[0].eventName).toBe('SecondVersion');
      expect(JSON.parse(found[0].payload).version).toBe(2);
    });
  });

  describe('processing state transitions', () => {
    it('moves events between unprocessed and processed states on save', async () => {
      const event = createRealisticEvent({
        id: 'evt-transition',
        eventName: 'StateTransitionTest',
        payload: { state: 'initial' },
      });

      // Initially unprocessed
      await repo.save(event);
      let unprocessed = await repo.findUnprocessed(10);
      expect(unprocessed.map((x) => x.id)).toEqual(['evt-transition']);

      // Mark as processed
      event.processedAt = new Date();
      await repo.save(event);

      unprocessed = await repo.findUnprocessed(10);
      expect(unprocessed).toHaveLength(0);

      // Verify event still exists in database but not in unprocessed results
      const collection = db.collection('outbox_events');
      const storedEvent = await collection.findOne({ id: 'evt-transition' });
      expect(storedEvent).toBeTruthy();
      expect(storedEvent!.processedAt).toBeTruthy();
    });

    it('handles retry count increments correctly', async () => {
      const event = createRealisticEvent({
        id: 'evt-retry',
        retryCount: 0,
        maxRetries: 5,
      });

      await repo.save(event);

      // Simulate retries
      for (let i = 1; i <= 3; i++) {
        event.retryCount = i;
        await repo.save(event);

        const found = await repo.findUnprocessed(1);
        expect(found[0].retryCount).toBe(i);
        expect(found[0].canRetry()).toBe(true);
      }

      // Max out retries
      event.retryCount = 5;
      await repo.save(event);
      const found = await repo.findUnprocessed(1);
      expect(found[0].canRetry()).toBe(false);
    });

    it('preserves all event properties through save/load cycle', async () => {
      const originalEvent = createRealisticEvent({
        id: 'evt-preserve',
        eventName: 'CompleteEventTest',
        topic: 'preservation-test',
        payload: { nested: { deep: { value: 'test' } } },
        createdAt: new Date('2024-01-15T10:30:00Z'),
        retryCount: 2,
        maxRetries: 10,
      });

      await repo.save(originalEvent);
      const [retrieved] = await repo.findUnprocessed(1);

      expect(retrieved.id).toBe(originalEvent.id);
      expect(retrieved.eventName).toBe(originalEvent.eventName);
      expect(retrieved.topic).toBe(originalEvent.topic);
      expect(retrieved.payload).toBe(originalEvent.payload);
      expect(retrieved.createdAt).toEqual(originalEvent.createdAt);
      expect(retrieved.retryCount).toBe(originalEvent.retryCount);
      expect(retrieved.maxRetries).toBe(originalEvent.maxRetries);
      expect(retrieved.isUnprocessed()).toBe(true);
    });
  });

  describe('pagination and limits', () => {
    it('respects limit when fetching unprocessed events', async () => {
      const events = generateEvents(20, {
        startMsAgo: 20000,
        stepMs: 1000,
        eventNames: ['UserAction', 'SystemEvent', 'Notification'],
      });

      for (const e of events) {
        await repo.save(e);
      }

      // Test various limits
      const limits = [1, 5, 10, 15, 20, 25];
      for (const limit of limits) {
        const found = await repo.findUnprocessed(limit);
        expect(found).toHaveLength(Math.min(limit, 20));

        // Verify ordering is maintained
        for (let i = 1; i < found.length; i++) {
          expect(found[i].createdAt.getTime()).toBeGreaterThanOrEqual(
            found[i - 1].createdAt.getTime(),
          );
        }
      }
    });

    it('returns consistent results for repeated queries', async () => {
      const events = generateEvents(10);
      for (const e of events) {
        await repo.save(e);
      }

      const firstQuery = await repo.findUnprocessed(5);
      const secondQuery = await repo.findUnprocessed(5);
      const thirdQuery = await repo.findUnprocessed(5);

      expect(firstQuery.map((e) => e.id)).toEqual(secondQuery.map((e) => e.id));
      expect(secondQuery.map((e) => e.id)).toEqual(thirdQuery.map((e) => e.id));
    });
  });

  describe('cleanup operations', () => {
    it('deletes only processed events older than cutoff date', async () => {
      const now = Date.now();

      // Create events with various processed times
      const veryOld = createRealisticEvent({
        id: 'evt-very-old',
        eventName: 'AncientEvent',
        createdAt: new Date(now - 30000),
        processedAt: new Date(now - 25000), // Processed 25s ago
      });

      const old = createRealisticEvent({
        id: 'evt-old',
        eventName: 'OldEvent',
        createdAt: new Date(now - 15000),
        processedAt: new Date(now - 10000), // Processed 10s ago
      });

      const recent = createRealisticEvent({
        id: 'evt-recent',
        eventName: 'RecentEvent',
        createdAt: new Date(now - 5000),
        processedAt: new Date(now - 1000), // Processed 1s ago
      });

      const unprocessed = createRealisticEvent({
        id: 'evt-unprocessed',
        eventName: 'UnprocessedEvent',
        createdAt: new Date(now - 20000), // Old but not processed
      });

      await repo.save(veryOld);
      await repo.save(old);
      await repo.save(recent);
      await repo.save(unprocessed);

      // Delete events processed more than 5 seconds ago
      const cutoff = new Date(now - 5000);
      await repo.deleteProcessed(cutoff);

      const collection = db.collection('outbox_events');

      // Very old and old should be deleted
      expect(await collection.findOne({ id: 'evt-very-old' })).toBeNull();
      expect(await collection.findOne({ id: 'evt-old' })).toBeNull();

      // Recent and unprocessed should remain
      expect(await collection.findOne({ id: 'evt-recent' })).not.toBeNull();
      expect(await collection.findOne({ id: 'evt-unprocessed' })).not.toBeNull();

      // Unprocessed should still be in the unprocessed list
      const unprocessedList = await repo.findUnprocessed(10);
      expect(unprocessedList.map((e) => e.id)).toContain('evt-unprocessed');
      expect(unprocessedList.map((e) => e.id)).not.toContain('evt-recent');
    });

    it('handles edge case with exact cutoff time', async () => {
      const now = Date.now();
      const cutoffTime = now - 5000;

      const exactCutoff = createRealisticEvent({
        id: 'evt-exact',
        processedAt: new Date(cutoffTime), // Exactly at cutoff
      });

      const beforeCutoff = createRealisticEvent({
        id: 'evt-before',
        processedAt: new Date(cutoffTime - 1), // 1ms before cutoff
      });

      const afterCutoff = createRealisticEvent({
        id: 'evt-after',
        processedAt: new Date(cutoffTime + 1000), // 1s after cutoff to ensure it's definitely kept
      });

      await repo.save(exactCutoff);
      await repo.save(beforeCutoff);
      await repo.save(afterCutoff);

      const cutoffDate = new Date(cutoffTime);
      await repo.deleteProcessed(cutoffDate);

      const collection = db.collection('outbox_events');

      // Events before cutoff should be deleted (MongoDB $lt is exclusive)
      expect(await collection.findOne({ id: 'evt-exact' })).not.toBeNull();
      expect(await collection.findOne({ id: 'evt-before' })).toBeNull();

      // Event after cutoff should remain
      const afterEvent = await collection.findOne({ id: 'evt-after' });
      expect(afterEvent).not.toBeNull();
    });

    it('handles empty processed list gracefully', async () => {
      // Create only unprocessed events
      const events = generateEvents(5, { processedRatio: 0 });
      for (const e of events) {
        await repo.save(e);
      }

      // Should not throw and should not delete anything
      await expect(repo.deleteProcessed(new Date())).resolves.not.toThrow();

      // All events should still exist
      const found = await repo.findUnprocessed(10);
      expect(found).toHaveLength(5);
    });
  });

  describe('edge cases and error scenarios', () => {
    it('handles concurrent saves correctly', async () => {
      const eventId = 'evt-concurrent';
      const event1 = createRealisticEvent({
        id: eventId,
        payload: { version: 1 },
      });
      const event2 = createRealisticEvent({
        id: eventId,
        payload: { version: 2 },
        processedAt: new Date(),
      });

      // Save both versions concurrently
      await Promise.all([repo.save(event1), repo.save(event2)]);

      // The last write should win (non-deterministic in concurrent case)
      const collection = db.collection('outbox_events');
      const stored = await collection.findOne({ id: eventId });
      expect(stored).toBeTruthy();

      // Should not be in unprocessed list if any write had processedAt
      const unprocessed = await repo.findUnprocessed(10);
      // Either both succeeded and last one wins, or one of them won
      // If event2 won, it shouldn't be in unprocessed
      const inUnprocessed = unprocessed.some((e) => e.id === eventId);
      if (stored!.processedAt.getTime() !== OutboxEvent.NEVER_PROCESSED.getTime()) {
        expect(inUnprocessed).toBe(false);
      }
    });

    it('handles special characters in payloads', async () => {
      const specialPayload = {
        text: 'Special chars: \n\r\t\\\'"',
        unicode: '🚀 émoji tëst 中文字符',
        nested: {
          array: [null, undefined, true, false, 0, ''],
          date: new Date().toISOString(),
        },
      };

      const event = createRealisticEvent({
        id: 'evt-special',
        payload: specialPayload,
      });

      await repo.save(event);
      const [found] = await repo.findUnprocessed(1);

      const retrievedPayload = JSON.parse(found.payload);
      expect(retrievedPayload.text).toBe('Special chars: \n\r\t\\\'"');
      expect(retrievedPayload.unicode).toBe('🚀 émoji tëst 中文字符');
    });

    it('maintains data integrity across multiple operations', async () => {
      const eventId = 'evt-integrity';
      const event = createRealisticEvent({ id: eventId });

      // Save, update, and re-save multiple times
      await repo.save(event);

      event.retryCount = 1;
      await repo.save(event);

      event.retryCount = 2;
      await repo.save(event);

      // Verify final state
      const result = await repo.findUnprocessed(1);
      expect(result).toHaveLength(1);
      const final = result[0];
      expect(final.id).toBe(eventId);
      expect(final.retryCount).toBe(2);
      expect(final.isUnprocessed()).toBe(true);

      // Now process it
      final.processedAt = new Date();
      await repo.save(final);

      // Should no longer be in unprocessed list
      const processedResult = await repo.findUnprocessed(1);
      expect(processedResult.map((e) => e.id)).not.toContain(eventId);
    });
  });

  describe('index management', () => {
    it('creates proper indexes on initialization', async () => {
      const collection = db.collection('outbox_events');
      const indexes = await collection.listIndexes().toArray();

      // Check for required indexes
      const indexNames = indexes.map((idx) => idx.name);
      expect(indexNames).toContain('ux_outbox_id');
      expect(indexNames).toContain('idx_outbox_processedAt');
      expect(indexNames).toContain('idx_outbox_createdAt');

      // Verify unique constraint on id
      const idIndex = indexes.find((idx) => idx.name === 'ux_outbox_id');
      expect(idIndex?.unique).toBe(true);
    });

    it('handles duplicate index creation gracefully', async () => {
      // Creating repository again should not throw
      const newRepo = new MongoOutboxRepository(mongoClient, configService);
      await expect(newRepo.onModuleInit()).resolves.not.toThrow();
    });
  });
});

// Helper functions
function createRealisticEventFactory() {
  return function createRealisticEvent(
    overrides: Partial<{
      id: string;
      eventName: string;
      topic: string;
      payload: any;
      createdAt: Date;
      processedAt?: Date;
      retryCount: number;
      maxRetries: number;
    }> = {},
  ): OutboxEvent {
    const defaultPayload = {
      userId: 'user-123',
      action: 'USER_CREATED',
      timestamp: new Date().toISOString(),
      metadata: { source: 'api', version: '1.0' },
    };

    return new OutboxEvent({
      id: overrides.id ?? `evt-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      eventName: overrides.eventName ?? 'UserCreated',
      topic: overrides.topic ?? 'user-events',
      payload:
        typeof overrides.payload === 'object'
          ? JSON.stringify(overrides.payload)
          : (overrides.payload ?? JSON.stringify(defaultPayload)),
      createdAt: overrides.createdAt ?? new Date(),
      processedAt: overrides.processedAt ?? OutboxEvent.NEVER_PROCESSED,
      retryCount: overrides.retryCount ?? 0,
      maxRetries: overrides.maxRetries ?? 3,
    });
  };
}

function generateEventsFactory() {
  return function generateEvents(
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

    const now = Date.now();
    const events: OutboxEvent[] = [];
    for (let i = 0; i < count; i++) {
      const createdAt = new Date(now - (startMsAgo + i * stepMs));
      const eventName = eventNames[i % eventNames.length];
      const payload = {
        id: `entity-${i}`,
        eventType: eventName,
        timestamp: createdAt.toISOString(),
        data: { index: i, test: true },
      };

      const e = new OutboxEvent({
        id: `evt-${i}-${createdAt.getTime()}`,
        eventName,
        topic,
        payload: JSON.stringify(payload),
        createdAt,
        processedAt: OutboxEvent.NEVER_PROCESSED,
        retryCount: 0,
        maxRetries: 3,
      });
      // Mark some as processed based on ratio
      if (processedRatio > 0 && i / Math.max(1, count - 1) <= processedRatio) {
        e.processedAt = new Date(createdAt.getTime() + 50);
      }
      events.push(e);
    }
    return events;
  };
}
