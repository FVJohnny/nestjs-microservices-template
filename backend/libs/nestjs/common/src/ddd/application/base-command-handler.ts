import { EventBus, ICommand } from '@nestjs/cqrs';
import { AggregateRoot } from '../domain/entities/AggregateRoot';

/**
 * Base class for all command handlers
 * 
 * Provides common functionality including authorization and domain event publishing
 */
export abstract class BaseCommandHandler<TCommand extends ICommand, TResult = any> {
  
  constructor(protected readonly eventBus: EventBus) {}

  /**
   * Executes the command
   */
  abstract execute(command: TCommand): Promise<TResult>;

  
  /**
   * Authorization check that must be implemented by all command handlers
   * 
   * @param command - The command to authorize
   * @throws {Error} Should throw an error if authorization fails
   */
  protected abstract authorize(command: TCommand): Promise<boolean>;

  /**
   * Publishes all domain events from an aggregate root
   * 
   * This method extracts and publishes all uncommitted domain events
   * from the provided aggregate root through the event bus
   * 
   * @param entity - The aggregate root containing domain events to publish
   */
  protected async sendDomainEvents(entity: AggregateRoot): Promise<void> {
    const events = entity.getUncommittedEvents();
    
    // Publish each domain event through the event bus
    await this.eventBus.publishAll(events);

    // Mark events as committed by clearing uncommitted events
    entity.commit();
  }

}