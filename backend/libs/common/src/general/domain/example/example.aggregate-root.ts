import { DateVO } from '../value-objects/DateValueObject';
import { Id } from '../value-objects/Id';
import { Timestamps } from '../value-objects/TimestampsValueObject';
import { SharedAggregateRoot } from '../aggregate-root';
import type { EntityExampleDTO } from './example.dto';

interface EntityExampleCreateProps {
  value: string;
}

interface EntityExampleAttributes {
  id: Id;
  timestamps: Timestamps;
  value: string;
}

export class EntityExample extends SharedAggregateRoot {
  value: string;

  private constructor(props: EntityExampleAttributes) {
    super();
    this.value = props.value;
  }

  static create(props: EntityExampleCreateProps): EntityExample {
    return new EntityExample({
      id: Id.random(),
      timestamps: Timestamps.create(),
      value: props.value,
    });
  }

  static fromValue(dto: EntityExampleDTO): EntityExample {
    return new EntityExample({
      id: new Id(dto.id),
      timestamps: new Timestamps(new DateVO(dto.createdAt), new DateVO(dto.updatedAt)),
      value: dto.value,
    });
  }

  toValue(): EntityExampleDTO {
    return {
      ...super.toValue(),
      value: this.value,
    };
  }
}
