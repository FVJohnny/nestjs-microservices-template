/**
 * Base interface for all use cases following the Command pattern
 * 
 * Use cases represent application-specific business logic and orchestrate
 * the flow of data to/from entities and repositories. They should be
 * independent of external frameworks and delivery mechanisms.
 * 
 * @template TRequest - The input parameter type for the use case
 * @template TResponse - The return type from the use case execution
 */
export interface UseCase<TRequest = void, TResponse = void> {
  /**
   * Executes the use case with the provided request
   * 
   * @param request - The input parameters for the use case
   * @returns Promise resolving to the use case response
   * @throws BusinessRuleException when business rules are violated
   */
  execute(request: TRequest): Promise<TResponse>;
}