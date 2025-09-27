import type { IndexSpec } from '../base-mongo.repository';
import { BaseMongoRepository } from '../base-mongo.repository';
import type { EntityExampleDTO } from '@libs/nestjs-common';
import type { MongoClient } from 'mongodb';
import { EntityExample } from '@libs/nestjs-common';

export class ExampleMongoRepository extends BaseMongoRepository<EntityExample, EntityExampleDTO> {
  static CollectionName = 'transaction-test';

  constructor(mongoClient: MongoClient) {
    super(mongoClient, ExampleMongoRepository.CollectionName);
  }

  protected toEntity(dto: EntityExampleDTO): EntityExample {
    return EntityExample.fromValue(dto);
  }

  protected defineIndexes(): IndexSpec[] {
    return [];
  }
}
