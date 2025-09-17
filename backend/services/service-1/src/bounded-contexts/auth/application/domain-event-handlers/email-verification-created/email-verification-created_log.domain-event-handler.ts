import { EventsHandler } from '@nestjs/cqrs';
import { DomainEventHandlerBase } from '@libs/nestjs-common';
import { EmailVerificationCreated_DomainEvent } from '@bc/auth/domain/events/email-verification-created.domain-event';

@EventsHandler(EmailVerificationCreated_DomainEvent)
export class EmailVerificationCreated_Log_DomainEventHandler extends DomainEventHandlerBase<EmailVerificationCreated_DomainEvent> {
  async handleEvent(event: EmailVerificationCreated_DomainEvent) {
    this.logger.debug(`EmailVerificationCreated_Log_DomainEventHandler ${event.email.toValue()}`);
  }
}
