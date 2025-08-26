import { DatabaseException } from '@libs/nestjs-common';

/**
 * Infrastructure errors for Channel persistence
 */

export class ChannelPersistenceException extends DatabaseException {
  constructor(
    operation: string,
    channelId: string,
    cause: Error,
    metadata?: Record<string, any>,
  ) {
    super(
      operation,
      `Failed to ${operation} channel ${channelId}`,
      { channelId, ...metadata },
      cause,
    );
  }
}
