import { QueryHandler, type IQuery } from '@nestjs/cqrs';
import { WithSpan } from '../tracing';
import { CorrelationLogger } from '../logger';

/**
 * Base class for query handlers with built-in @QueryHandler decorator.
 *
 * @example
 * ```typescript
 * // Instead of:
 * // @QueryHandler(GetUserById_Query)
 * // export class GetUserById_QueryHandler extends Base_QueryHandler<GetUserById_Query, GetUserByIdResponse> { ... }
 *
 * // Just use:
 * export class GetUserById_QueryHandler extends Base_QueryHandler(GetUserById_Query)<GetUserByIdResponse> {
 *   constructor(
 *     @Inject(USER_REPOSITORY) private readonly userRepository: User_Repository,
 *   ) {
 *     super();
 *   }
 *
 *   async handle(query: GetUserById_Query): Promise<GetUserByIdResponse> { ... }
 *   async authorize(query: GetUserById_Query) { return true; }
 *   async validate(query: GetUserById_Query) { }
 * }
 * ```
 */
export function Base_QueryHandler<TQuery extends IQuery>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: new (...args: any[]) => TQuery,
) {
  return function <TResult extends object>() {
    @QueryHandler(query)
    abstract class Base_QueryHandlerClass {
      readonly logger: CorrelationLogger;

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

      abstract handle(query: TQuery): Promise<TResult>;

      abstract authorize(query: TQuery): Promise<boolean>;

      abstract validate(query: TQuery): Promise<void>;
    }

    return Base_QueryHandlerClass;
  };
}
