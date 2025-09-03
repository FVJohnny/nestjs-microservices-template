import {
  StringValueObject,
  DomainValidationException,
} from '@libs/nestjs-common';

export class Name extends StringValueObject {
  private static readonly MAX_LENGTH = 50;
  private static readonly MAX_WORDS = 2;
  private static readonly NAME_REGEX = /^[a-zA-ZÀ-ÿ\u00C0-\u017F\s'-]+$/;

  constructor(value: string) {
    Name.validate(value);
    super(Name.normalize(value));
  }

  static empty(): Name {
    return new Name('');
  }

  static validate(name: string): void {
    // Allow empty strings for names
    if (name === undefined || name === null) {
      throw new DomainValidationException(
        'name',
        name,
        'Name cannot be null or undefined',
      );
    }

    const trimmed = name.trim();

    // Empty names are allowed
    if (trimmed.length === 0) {
      return;
    }

    if (trimmed.length > Name.MAX_LENGTH) {
      throw new DomainValidationException(
        'name',
        trimmed,
        `Name cannot exceed ${Name.MAX_LENGTH} characters`,
      );
    }

    if (!Name.NAME_REGEX.test(trimmed)) {
      throw new DomainValidationException(
        'name',
        trimmed,
        'Name can only contain letters, spaces, hyphens, and apostrophes',
      );
    }

    const words = trimmed.split(/\s+/).filter((word) => word.length > 0);
    if (words.length > Name.MAX_WORDS) {
      throw new DomainValidationException(
        'name',
        trimmed,
        `Name cannot have more than ${Name.MAX_WORDS} words`,
      );
    }

    // Check that each word is not empty and contains at least one letter
    for (const word of words) {
      if (word.length === 0 || !/[a-zA-ZÀ-ÿ\u00C0-\u017F]/.test(word)) {
        throw new DomainValidationException(
          'name',
          trimmed,
          'Each word in name must contain at least one letter',
        );
      }
    }
  }

  private static normalize(name: string): string {
    const trimmed = name.trim();

    // Return empty string as is
    if (trimmed.length === 0) {
      return '';
    }

    return trimmed
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  getWords(): string[] {
    return this.toValue().split(' ');
  }

  getFirstWord(): string {
    return this.getWords()[0];
  }

  getSecondWord(): string | null {
    const words = this.getWords();
    return words.length > 1 ? words[1] : null;
  }
}
