import type { TracingMetadata } from '../../../tracing';

export abstract class BaseQuery {
  public metadata?: TracingMetadata;

  constructor(metadata?: TracingMetadata) {
    this.metadata = metadata;
  }
}
