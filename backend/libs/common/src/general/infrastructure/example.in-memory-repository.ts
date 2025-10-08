import { InMemoryBaseRepository } from './in-memory-repository';
import { EntityExample } from '../domain/example/example.aggregate-root';
import type { EntityExampleDTO } from '../domain/example/example.dto';

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

  async findByValue(value: string): Promise<EntityExample | null> {
    const entity = await this.findAll();
    return entity.find((entity) => entity.value === value) ?? null;
  }
}
