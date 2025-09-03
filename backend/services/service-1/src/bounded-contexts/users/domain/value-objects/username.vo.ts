import {
  StringValueObject,
  DomainValidationException,
} from '@libs/nestjs-common';

export class Username extends StringValueObject {
  private static readonly MIN_LENGTH = 3;
  private static readonly MAX_LENGTH = 30;
  private static readonly USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

  constructor(value: string) {
    Username.validate(value);
    super(value.toLowerCase());
  }

  static validate(username: string): void {
    if (!username || username.trim().length === 0) {
      throw new DomainValidationException(
        'username',
        username,
        'Username cannot be empty',
      );
    }

    const trimmed = username.trim();

    if (trimmed.length < Username.MIN_LENGTH) {
      throw new DomainValidationException(
        'username',
        trimmed,
        `Username must be at least ${Username.MIN_LENGTH} characters long`,
      );
    }

    if (trimmed.length > Username.MAX_LENGTH) {
      throw new DomainValidationException(
        'username',
        trimmed,
        `Username cannot exceed ${Username.MAX_LENGTH} characters`,
      );
    }

    if (!Username.USERNAME_REGEX.test(trimmed)) {
      throw new DomainValidationException(
        'username',
        trimmed,
        'Username can only contain letters, numbers, underscores, and hyphens',
      );
    }
  }
}
