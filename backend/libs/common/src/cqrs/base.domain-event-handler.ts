import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';
import { CorrelationLogger } from '../logger';
import type { DomainEvent } from './base.domain-event';
import { WithSpan } from '../tracing';

/**
 * Base class for domain event handlers with built-in @EventsHandler decorator.
 *
 * @example
 * ```typescript
 * // Instead of:
 * // @EventsHandler(UserDeleted_DomainEvent)
 * // export class UserDeleted_Handler extends Base_DomainEventHandler<UserDeleted_DomainEvent> { ... }
 *
 * // Just use:
 * export class UserDeleted_Handler extends Base_DomainEventHandler(UserDeleted_DomainEvent) {
 *   constructor(@Inject(COMMAND_BUS) private readonly commandBus: ICommandBus) {
 *     super();
 *   }
 *
 *   async handleEvent(event: UserDeleted_DomainEvent) { ... }
 * }
 * ```
 */
export function Base_DomainEventHandler<T extends DomainEvent>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: new (...args: any[]) => T,
) {
  @EventsHandler(event)
  abstract class Base_DomainEventHandlerClass implements IEventHandler<T> {
    readonly logger: CorrelationLogger;

    constructor() {
      this.logger = new CorrelationLogger(this.constructor.name);
    }

    @WithSpan('domain_event.handle', { attributesFrom: ['constructor.name'] })
    async handle(event: T) {
      this.logger.log(`Handling domain event: ${event.constructor.name}`);
      return this.handleEvent(event);
    }

    abstract handleEvent(event: T): Promise<void>;
  }

  return Base_DomainEventHandlerClass;
}

/**
 * @deprecated Use Base_DomainEventHandler instead
 */
export const DomainEventHandlerBase = Base_DomainEventHandler;
