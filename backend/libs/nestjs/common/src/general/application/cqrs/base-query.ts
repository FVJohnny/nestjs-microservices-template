import type { TracingMetadataParams } from '../../../tracing';
import { TracingMetadata } from '../../../tracing';

export abstract class BaseQuery {
  public metadata?: TracingMetadata;

  constructor(metadataParams?: TracingMetadataParams) {
    this.metadata = new TracingMetadata(metadataParams);
  }
}