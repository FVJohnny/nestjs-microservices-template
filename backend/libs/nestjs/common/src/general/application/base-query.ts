import { TracingMetadata, TracingMetadataParams } from '../../tracing/tracing-metadata';

export abstract class BaseQuery {
  public metadata?: TracingMetadata;

  constructor(metadataParams?: TracingMetadataParams) {
    this.metadata = new TracingMetadata(metadataParams);
  }
}