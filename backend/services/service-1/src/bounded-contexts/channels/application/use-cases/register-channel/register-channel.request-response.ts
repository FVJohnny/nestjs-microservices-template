export interface RegisterChannelUseCaseProps {
  userId: string;
  channelType: string;
  name: string;
  connectionConfig: Record<string, any>;
}

export interface RegisterChannelUseCaseResponse {
  channelId: string;
  success: boolean;
}

// Business rule errors
export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User with id ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

export class TooManyChannelsError extends Error {
  constructor(userId: string) {
    super(`User ${userId} has reached maximum channel limit`);
    this.name = 'TooManyChannelsError';
  }
}

export class DuplicateChannelNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateChannelNameError';
  }
}
