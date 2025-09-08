import type { EventBus, ICommand } from '@nestjs/cqrs';

import type { SharedAggregateRoot } from '../../domain/entities/AggregateRoot';

export abstract class BaseCommandHandler<TCommand extends ICommand, TResult extends object | void> {
  constructor(protected readonly eventBus: EventBus) {}

  /**
   * Executes the command following the template method pattern:
   * 1. Authorize the command
   * 2. Validate business rules
   * 3. Handle the command (implemented by subclasses)
   */
  async execute(command: TCommand): Promise<TResult> {
    await this.authorize(command);
    await this.validate(command);
    return await this.handle(command);
  }

  /**
   * Handles the command business logic
   *
   * This method must be implemented by all command handlers
   * to define the specific business logic for the command
   *
   * @param command - The command to handle
   * @returns The result of handling the command
   */
  protected abstract handle(command: TCommand): Promise<TResult>;

  /**
   * Authorization check that must be implemented by all command handlers
   *
   * @param command - The command to authorize
   * @throws {Error} Should throw an error if authorization fails
   */
  protected abstract authorize(command: TCommand): Promise<boolean>;

  /**
   * Business validation that must be implemented by all command handlers
   *
   * This method is called during command execution to perform business rule validation
   * such as uniqueness checks, business invariants, etc.
   *
   * @param command - The command to validate
   * @throws {Error} Should throw an error if validation fails
   */
  protected abstract validate(command: TCommand): Promise<void>;

  /**
   * Publishes all domain events from an aggregate root
   *
   * This method extracts and publishes all uncommitted domain events
   * from the provided aggregate root through the event bus
   *
   * @param entity - The aggregate root containing domain events to publish
   */
  protected async sendDomainEvents<T extends SharedAggregateRoot>(entity: T): Promise<void> {
    const events = entity.getUncommittedEvents();

    // Publish each domain event through the event bus
    await this.eventBus.publishAll(events);

    // Mark events as committed by clearing uncommitted events
    entity.commit();
  }
}
