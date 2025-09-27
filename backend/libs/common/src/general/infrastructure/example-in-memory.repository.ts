import { InMemoryBaseRepository } from './in-memory-base.repository';
import { EntityExample, type EntityExampleDTO } from '../domain/entities/EntityExample';

export class ExampleInMemoryRepository extends InMemoryBaseRepository<
  EntityExample,
  EntityExampleDTO
> {
  constructor(shouldFail = false) {
    super(shouldFail);
  }

  protected toEntity(dto: EntityExampleDTO): EntityExample {
    return EntityExample.fromValue(dto);
  }
}
