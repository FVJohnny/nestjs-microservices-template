import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for use case information
 */
export const USE_CASE_METADATA_KEY = 'useCase';

/**
 * Use case metadata interface
 */
export interface UseCaseMetadata {
  /**
   * Name of the use case for logging and metrics
   */
  name: string;
  
  /**
   * Description of what this use case does
   */
  description?: string;
  
  /**
   * Category or domain this use case belongs to
   */
  category?: string;
  
  /**
   * Whether to enable automatic performance tracking
   */
  trackPerformance?: boolean;
}

/**
 * Decorator to mark a class as a use case and provide metadata
 * 
 * @param metadata - Use case metadata
 * @returns Class decorator
 * 
 * @example
 * ```typescript
 * @UseCaseHandler({
 *   name: 'RegisterChannel',
 *   description: 'Registers a new channel with business validation',
 *   category: 'channels',
 *   trackPerformance: true
 * })
 * export class RegisterChannelUseCaseImpl implements RegisterChannelUseCase {
 *   // implementation
 * }
 * ```
 */
export function UseCaseHandler(metadata: UseCaseMetadata): ClassDecorator {
  return SetMetadata(USE_CASE_METADATA_KEY, metadata);
}

/**
 * Helper function to get use case metadata from a class
 */
export function getUseCaseMetadata(target: any): UseCaseMetadata | undefined {
  return Reflect.getMetadata(USE_CASE_METADATA_KEY, target);
}