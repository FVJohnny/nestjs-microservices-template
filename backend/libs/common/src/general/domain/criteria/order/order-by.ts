import { StringValueObject } from '../../value-objects/string.vo';

export class OrderBy extends StringValueObject {
  constructor(value: string) {
    super(value);
  }
}
