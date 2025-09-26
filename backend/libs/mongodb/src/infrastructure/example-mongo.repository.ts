import type { IndexSpec } from '../base-mongo.repository';
import { BaseMongoRepository } from '../base-mongo.repository';
import type { EntityExampleDTO } from '@libs/nestjs-common';
import type { MongoClient } from 'mongodb';
import { EntityExample } from '@libs/nestjs-common';

export class ExampleMongoRepository extends BaseMongoRepository<EntityExample, EntityExampleDTO> {
  constructor(mongoClient: MongoClient) {
    super(mongoClient, 'transaction-test');
  }

  protected toEntity(dto: EntityExampleDTO): EntityExample {
    return EntityExample.fromValue(dto);
  }

  protected defineIndexes(): IndexSpec[] {
    return [];
  }
}
