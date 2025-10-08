import { StringValueObject } from '../../value-objects/StringValueObject';

export class OrderBy extends StringValueObject {
  constructor(value: string) {
    super(value);
  }
}
