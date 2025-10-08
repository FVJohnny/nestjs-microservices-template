import { StringValueObject, DomainValidationException, type IValueObject } from '@libs/nestjs-common';

let _seq = 0;
export class Username extends StringValueObject implements IValueObject<string> {
  private static readonly MIN_LENGTH = 3;
  private static readonly MAX_LENGTH = 30;
  private static readonly USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

  constructor(value: string) {
    super(value.toLowerCase());
  }

  static random(): Username {
    _seq++;
    return new Username(`user${_seq}`);
  }

  validate(): void {
    super.validate();

    if (!this.value || this.value.trim().length === 0) {
      throw new DomainValidationException('username', this.value, 'Username cannot be empty');
    }

    const trimmed = this.value.trim();

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
