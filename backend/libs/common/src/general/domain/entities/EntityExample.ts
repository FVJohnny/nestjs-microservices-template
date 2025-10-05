import { SharedAggregateRoot, SharedAggregateRootDTO } from './AggregateRoot';
import { Id } from '../value-object/Id';

export class EntityExample extends SharedAggregateRoot {
  private constructor(
    id: Id,
    readonly value: string,
  ) {
    super(id);
  }

  static create(value: string, id: Id = Id.random()): EntityExample {
    return new EntityExample(id, value);
  }

  static fromValue(dto: EntityExampleDTO): EntityExample {
    return new EntityExample(new Id(dto.id), dto.value);
  }

  toValue(): EntityExampleDTO {
    return {
      id: this.id.toValue(),
      value: this.value,
      createdAt: this.timestamps.createdAt.toValue(),
      updatedAt: this.timestamps.updatedAt.toValue(),
    };
  }
}

export class EntityExampleDTO extends SharedAggregateRootDTO {
  value: string;
}
