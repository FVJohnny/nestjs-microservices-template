import { StringValueObject, DomainValidationException } from '@libs/nestjs-common';

let _seq = 0;
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

  static random() {
    return new Email(`random-email-${_seq++}@random-domain.com`);
  }

  getDomain(): string {
    return this.toValue().split('@')[1];
  }

  getLocalPart(): string {
    return this.toValue().split('@')[0];
  }
}
