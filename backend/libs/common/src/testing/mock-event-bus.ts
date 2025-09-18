import type { IEventBus } from '@nestjs/cqrs';

import { ApplicationException } from '../errors';
import type { DomainEvent } from '../cqrs';

export interface MockEventBusOptions {
  shouldFail?: boolean;
}

/**
 * Lightweight EventBus test double that only records published events.
 */
export class MockEventBus implements IEventBus {
  public readonly events: DomainEvent[] = [];
  public shouldFail: boolean;

  constructor(options: MockEventBusOptions = {}) {
    this.shouldFail = options.shouldFail ?? false;
  }

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    if (this.shouldFail) {
      throw new ApplicationException('EventBus publish failed');
    }

    this.events.push(event);
  }

  async publishAll<T extends DomainEvent>(events: T[]): Promise<void> {
    if (this.shouldFail) {
      throw new ApplicationException('EventBus publishAll failed');
    }

    this.events.push(...events);
  }
}
