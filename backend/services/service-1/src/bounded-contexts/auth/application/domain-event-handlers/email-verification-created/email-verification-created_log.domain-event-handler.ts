import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CorrelationLogger } from '@libs/nestjs-common';
import { EmailVerificationCreated_DomainEvent } from '@bc/auth/domain/events/email-verification-created.domain-event';

@EventsHandler(EmailVerificationCreated_DomainEvent)
export class EmailVerificationCreated_Log_DomainEventHandler
  implements IEventHandler<EmailVerificationCreated_DomainEvent>
{
  private readonly logger = new CorrelationLogger(
    EmailVerificationCreated_Log_DomainEventHandler.name,
  );

  async handle(event: EmailVerificationCreated_DomainEvent): Promise<void> {
    this.logger.log(`EmailVerificationCreated_Log_DomainEventHandler ${event.email.toValue()}`);
  }
}
