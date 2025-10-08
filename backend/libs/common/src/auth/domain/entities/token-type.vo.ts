import { EnumValueObject } from '../../../general/domain/value-objects/EnumValueObject';
import type { IValueObject } from '../../../general/domain/value-objects';

type TokenTypeEnum = 'access' | 'refresh';
const TOKEN_TYPE_VALUES: TokenTypeEnum[] = ['access', 'refresh'];

export class TokenType extends EnumValueObject<TokenTypeEnum> implements IValueObject<string> {
  constructor(value: string) {
    super(value as TokenTypeEnum, TOKEN_TYPE_VALUES);
  }

  protected throwErrorForInvalidValue(value: string): void {
    throw new Error(`Invalid token type: ${value}. Must be either 'access' or 'refresh'.`);
  }

  static readonly ACCESS = new TokenType('access');
  static readonly REFRESH = new TokenType('refresh');
}
