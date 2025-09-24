import type { Id } from '../value-object/Id';
import type { RepositoryContext } from '../../../transactions';

/**
 * Base repository interface for domain entities.
 * Provides common CRUD operations that can be extended by specific repositories.
 */
export interface Repository<T, ID = Id> {
  /**
   * Executes repository operations within a transactional context.
   */
  withTransaction(work: (context: RepositoryContext) => Promise<void>): Promise<void>;

  /**
   * Finds an entity by its ID
   */
  findById(id: ID, context?: RepositoryContext): Promise<T | null>;

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
