import { CorrelationService } from '../../correlation/correlation.service';
import { CqrsMetadata } from './cqrs-metadata';

export abstract class BaseCommand {
  public metadata?: CqrsMetadata;

  constructor(metadata?: CqrsMetadata) {
    this.metadata = {
      correlationId: metadata?.correlationId ?? CorrelationService.getCorrelationId() ?? 'none',
      causationId: metadata?.causationId ?? 'none',
      userId: metadata?.userId ?? 'anonymous'
    };
  }
}