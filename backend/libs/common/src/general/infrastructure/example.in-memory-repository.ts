import { Base_InMemory_Repository } from './base.in-memory-repository';
import { EntityExample } from '../domain/example/example.aggregate-root';
import type { EntityExampleDTO } from '../domain/example/example.dto';

export class Example_InMemory_Repository extends Base_InMemory_Repository<
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
