import { CqrsMetadata } from './cqrs-metadata';

export abstract class BaseCommand {
  public readonly metadata?: CqrsMetadata;

  constructor(metadata?: CqrsMetadata) {
    this.metadata = metadata;
  }
}