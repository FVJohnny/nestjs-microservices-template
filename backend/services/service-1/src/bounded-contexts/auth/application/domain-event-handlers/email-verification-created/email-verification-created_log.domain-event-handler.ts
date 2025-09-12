import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CorrelationLogger } from '@libs/nestjs-common';
import { EmailVerificationCreatedDomainEvent } from '../../../domain/events/email-verification-created.domain-event';

@EventsHandler(EmailVerificationCreatedDomainEvent)
export class EmailVerificationCreated_Log_DomainEventHandler
  implements IEventHandler<EmailVerificationCreatedDomainEvent>
{
  private readonly logger = new CorrelationLogger(
    EmailVerificationCreated_Log_DomainEventHandler.name,
  );

  async handle(event: EmailVerificationCreatedDomainEvent): Promise<void> {
    // For now, we just log the event
    this.logger.log('EmailVerificationCreated_Log_DomainEventHandler', event);
  }
}
