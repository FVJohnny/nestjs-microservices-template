import { v4 as uuid } from 'uuid';
import validate from 'uuid-validate';

import { ValueObject } from './ValueObject';
import { DomainValidationException } from '../../../errors';

export class Id extends ValueObject<string> {
  constructor(value: string) {
    super(value);
    this.ensureIsValidUuid(value);
  }

  static random(): Id {
    return new Id(uuid());
  }

  private ensureIsValidUuid(id: string): void {
    if (!validate(id)) {
      throw new DomainValidationException(
        `${this.constructor.name}`,
        id,
        `${this.constructor.name} does not allow the value <${id}>`,
      );
    }
  }
}
