import { DatabaseException } from '@libs/nestjs-common';

/**
 * Infrastructure errors for User persistence
 */

export class UserPersistenceException extends DatabaseException {
  constructor(
    operation: string,
    userId: string,
    cause: Error,
    metadata?: Record<string, any>,
  ) {
    super(
      operation,
      `Failed to ${operation} user ${userId}`,
      { userId, ...metadata },
      cause,
    );
  }
}