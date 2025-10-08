import { StringValueObject } from '../../../general/domain/value-objects/StringValueObject';

let _seq = 0;
export class Token extends StringValueObject {
  static random(): Token {
    return new Token(`random-token-${_seq++}-${Date.now()}`);
  }
}
