import { TracingMetadata, type TracingMetadataParams } from '../../../tracing';

export abstract class BaseCommand {
  public metadata?: TracingMetadata;

  constructor(metadataParams?: TracingMetadataParams) {
    this.metadata = new TracingMetadata(metadataParams);
  }
}
