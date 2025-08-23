import { Criteria } from "../criteria/Criteria";

/**
 * Base repository interface for domain entities.
 * Provides common CRUD operations that can be extended by specific repositories.
 */
export interface Repository<T, ID = string> {
  /**
   * Finds an entity by its ID
   */
  findById(id: ID): Promise<T | null>;

  /**
   * Finds all entities matching the given criteria
   */
  findByCriteria(criteria: Criteria): Promise<T[]>;

  /**
   * Saves an entity (create or update)
   */
  save(entity: T): Promise<T>;

  /**
   * Removes an entity by its ID
   */
  remove(id: ID): Promise<void>;

  /**
   * Checks if an entity exists by its ID
   */
  exists(id: ID): Promise<boolean>;
}