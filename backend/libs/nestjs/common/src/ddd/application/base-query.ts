import { CqrsMetadata } from './cqrs-metadata';

export abstract class BaseQuery {
  public metadata?: CqrsMetadata;

  constructor(metadata?: CqrsMetadata) {
    this.metadata = metadata;
  }
}