import type { Email, Username } from '@bc/auth/domain/value-objects';

/**
 * Domain service interface for checking user uniqueness constraints.
 * This enforces the business rule that emails and usernames must be unique.
 */
export const USER_UNIQUENESS_CHECKER = Symbol('UserUniquenessChecker');

export interface IUserUniquenessChecker {
  /**
   * Checks if the given email is unique (not already taken by another user)
   * @param email - The email to check
   * @returns true if email is unique, false if already exists
   */
  isEmailUnique(email: Email): Promise<boolean>;

  /**
   * Checks if the given username is unique (not already taken by another user)
   * @param username - The username to check
   * @returns true if username is unique, false if already exists
   */
  isUsernameUnique(username: Username): Promise<boolean>;
}
