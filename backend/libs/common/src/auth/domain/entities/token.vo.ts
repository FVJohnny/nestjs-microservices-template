import { type IValueObject } from '../../../general/domain/value-objects';
import { StringValueObject } from '../../../general/domain/value-objects/string.vo';

let _seq = 0;
export class Token extends StringValueObject implements IValueObject<string> {
  static random(): Token {
    return new Token(`random-token-${_seq++}-${Date.now()}`);
  }
}
