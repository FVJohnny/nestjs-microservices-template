import type { Repository } from '../repository.base';
import type { EntityExample } from './example.aggregate-root';

export interface ExampleRepository extends Repository<EntityExample> {
  findByValue(value: string): Promise<EntityExample | null>;
}
