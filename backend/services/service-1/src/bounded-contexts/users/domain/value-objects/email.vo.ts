import { ValueObject, InvalidArgumentError } from '@libs/nestjs-common';

export class Email extends ValueObject<string> {
  constructor(value: string) {
    Email.validate(value);
    super(value.toLowerCase());
  }

  static validate(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new InvalidArgumentError(`Invalid email format: ${email}`);
    }
  }

  static fromString(email: string): Email {
    return new Email(email);
  }

  getDomain(): string {
    return this.value.split('@')[1];
  }

  getLocalPart(): string {
    return this.value.split('@')[0];
  }
}