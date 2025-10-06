import { StringValueObject } from '@libs/nestjs-common';

let _seq = 0;
export class Token extends StringValueObject {
  static random(): Token {
    return new Token(`random-token-${_seq++}-${Date.now()}`);
  }
}
