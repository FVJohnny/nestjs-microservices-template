import type { IQuery } from '@nestjs/cqrs';
import { WithSpan } from '../tracing';
import { CorrelationLogger } from '../logger';

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
  @WithSpan('query.execute', { attributesFrom: ['constructor.name'] })
  async execute(query: TQuery): Promise<TResult> {
    await this.authorize(query);
    await this.validate(query);

    this.logger.log(`Executing query: ${query.constructor.name}`);
    return this.handle(query);
  }

  protected abstract handle(query: TQuery): Promise<TResult>;

  protected abstract authorize(query: TQuery): Promise<boolean>;

  protected abstract validate(query: TQuery): Promise<void>;
}
