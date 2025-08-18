import { EventsHandler, IEvent, IEventHandler } from '@nestjs/cqrs';

// Generic constructor type for an event class
export type EventClass<T extends IEvent = IEvent> = new (...args: any[]) => T;

export interface EventCapture<T extends IEvent> {
  // Collected events for assertions
  events: T[];
  // Clear collected events (call in beforeEach)
  reset(): void;
}

/**
 * Creates a NestJS CQRS EventsHandler class that captures all events of the given type.
 *
 * Usage in tests:
 *   const Capture = createTestDomainEventTestHandler(ChannelRegisteredDomainEvent);
 *   Test.createTestingModule({ providers: [Capture, ...] })
 *   Capture.reset();
 *   expect(Capture.events).toHaveLength(1);
 */
export function createTestDomainEventTestHandler<T extends IEvent>(eventClass: EventClass<T>) {
  @EventsHandler(eventClass as any)
  class GenericCaptureHandler implements IEventHandler<T> {
    static events: T[] = [];

    static reset() {
      GenericCaptureHandler.events = [];
    }

    handle(event: T) {
      (GenericCaptureHandler.events as T[]).push(event);
    }
  }

  // Return type exposes the static helpers for tests
  return GenericCaptureHandler as unknown as (new (...args: any[]) => IEventHandler<T>) & EventCapture<T> & {
    events: T[];
    reset(): void;
  };
}
