import { StringValueObject, DomainValidationException } from '@libs/nestjs-common';
import * as bcrypt from 'bcrypt';

export class Password extends StringValueObject {
  private static readonly SALT_ROUNDS = process.env.NODE_ENV === 'test' ? 1 : 10;
  private static readonly MIN_LENGTH = 8;

  private constructor(value: string) {
    super(value);
  }

  static createFromPlainText(plainText: string): Password {
    Password.validatePlainText(plainText);
    const hashedPassword = bcrypt.hashSync(plainText, Password.SALT_ROUNDS);
    return new Password(hashedPassword);
  }

  static createFromHash(hash: string): Password {
    Password.validateHash(hash);
    return new Password(hash);
  }

  verify(plainText: string): boolean {
    return bcrypt.compareSync(plainText, this.toValue());
  }

  private static validatePlainText(password: string): void {
    if (!password || password.trim().length === 0) {
      throw new DomainValidationException('password', password, 'Password cannot be empty');
    }
    if (password.length < Password.MIN_LENGTH) {
      throw new DomainValidationException(
        'password',
        password,
        `Password must be at least ${Password.MIN_LENGTH} characters long`,
      );
    }
  }

  private static validateHash(hash: string): void {
    if (!hash || hash.trim().length === 0) {
      throw new DomainValidationException('password', hash, 'Password hash cannot be empty');
    }
  }
}
