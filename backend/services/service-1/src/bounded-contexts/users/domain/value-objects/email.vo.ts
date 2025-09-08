import { StringValueObject, DomainValidationException } from '@libs/nestjs-common';

export class Email extends StringValueObject {
  constructor(value: string) {
    Email.validate(value);
    super(value.toLowerCase());
  }

  static validate(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new DomainValidationException('email', email, `Invalid email format: ${email}`);
    }
  }

  getDomain(): string {
    return this.toValue().split('@')[1];
  }

  getLocalPart(): string {
    return this.toValue().split('@')[0];
  }
}
