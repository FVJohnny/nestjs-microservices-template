import type { IQuery } from '@nestjs/cqrs';
import { TracingService } from '../../../tracing';
import { CorrelationLogger } from '../../../logger';

/**
 * Base class for all query handlers
 *
 * Provides common functionality including authorization and validation
 * Implements the template method pattern with: authorize → validate → handle
 */
export abstract class BaseQueryHandler<TQuery extends IQuery, TResult extends object> {
  protected readonly logger: CorrelationLogger;

  constructor() {
    this.logger = new CorrelationLogger(this.constructor.name);
  }
  /**
   * Executes the query following the template method pattern:
   * 1. Authorize the query
   * 2. Validate query parameters
   * 3. Handle the query (implemented by subclasses)
   */
  async execute(query: TQuery): Promise<TResult> {
    await this.authorize(query);
    await this.validate(query);

    const metadata = TracingService.getTracingMetadata();
    const newMetadata = TracingService.createTracingMetadata(metadata);

    return await TracingService.runWithContext(newMetadata, () => {
      this.logger.log(`Executing query: ${query.constructor.name}`);
      return this.handle(query);
    });
  }

  /**
   * Handles the query business logic
   *
   * This method must be implemented by all query handlers
   * to define the specific logic for retrieving data
   *
   * @param query - The query to handle
   * @returns The result of handling the query
   */
  protected abstract handle(query: TQuery): Promise<TResult>;

  /**
   * Authorization check that must be implemented by all query handlers
   *
   * @param query - The query to authorize
   * @throws {Error} Should throw an error if authorization fails
   */
  protected abstract authorize(query: TQuery): Promise<boolean>;

  /**
   * Query parameter validation that must be implemented by all query handlers
   *
   * This method is called during query execution to perform parameter validation
   * such as range checks, format validation, etc.
   *
   * @param query - The query to validate
   * @throws {Error} Should throw an error if validation fails
   */
  protected abstract validate(query: TQuery): Promise<void>;
}
