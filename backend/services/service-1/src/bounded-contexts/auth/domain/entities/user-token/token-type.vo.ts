import { EnumValueObject } from '@libs/nestjs-common';

type TokenTypeEnum = 'access' | 'refresh';
const TOKEN_TYPE_VALUES: TokenTypeEnum[] = ['access', 'refresh'];

export class TokenType extends EnumValueObject<TokenTypeEnum> {
  constructor(value: TokenTypeEnum) {
    super(value, TOKEN_TYPE_VALUES);
  }

  protected throwErrorForInvalidValue(value: TokenTypeEnum): void {
    throw new Error(`Invalid token type: ${value}. Must be either 'access' or 'refresh'.`);
  }

  static readonly ACCESS = new TokenType('access');
  static readonly REFRESH = new TokenType('refresh');
}
