import type { Id } from '../value-object/Id';
import type { RepositoryContext } from '../../../transactions';
import type { PaginatedRepoResult } from '../../infrastructure';
import type { Criteria } from '../criteria/Criteria';

/**
 * Base repository interface for domain entities.
 * Provides common CRUD operations that can be extended by specific repositories.
 */
export interface Repository<T, ID = Id> {
  /**
   * Finds an entity by its ID
   */
  findById(id: ID, context?: RepositoryContext): Promise<T | null>;

  /**
   * Finds entities by criteria
   */
  findByCriteria(criteria: Criteria, context?: RepositoryContext): Promise<PaginatedRepoResult<T>>;

  /**
   * Counts entities by criteria
   */
  countByCriteria(criteria: Criteria, context?: RepositoryContext): Promise<number>;

  /**
   * Saves an entity (create or update)
   */
  save(entity: T, context?: RepositoryContext): Promise<void>;

  /**
   * Removes an entity by its ID
   */
  remove(id: ID, context?: RepositoryContext): Promise<void>;

  /**
   * Checks if an entity exists by its ID
   */
  exists(id: ID, context?: RepositoryContext): Promise<boolean>;

  /**
   * Clears the repository
   */
  clear(context?: RepositoryContext): Promise<void>;
}
