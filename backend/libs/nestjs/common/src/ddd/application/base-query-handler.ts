import { IQuery } from '@nestjs/cqrs';

/**
 * Base class for all query handlers
 * 
 * Provides common functionality including authorization
 */
export abstract class BaseQueryHandler<TQuery extends IQuery, TResult = any> {

  /**
   * Executes the query
   */
  abstract execute(query: TQuery): Promise<TResult>;

  /**
   * Authorization check that must be implemented by all query handlers
   * 
   * @param query - The query to authorize
   * @throws {Error} Should throw an error if authorization fails
   */
  protected abstract authorize(query: TQuery): Promise<boolean>;
}