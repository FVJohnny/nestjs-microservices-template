import type { TracingMetadata } from '../../../tracing';

export abstract class BaseCommand {
  public metadata?: TracingMetadata;

  constructor(metadata?: TracingMetadata) {
    this.metadata = metadata;
  }
}
