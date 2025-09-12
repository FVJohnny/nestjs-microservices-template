import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CorrelationLogger } from '@libs/nestjs-common';
import { EmailVerificationCreatedDomainEvent } from '../../../domain/events/email-verification-created.domain-event';

@EventsHandler(EmailVerificationCreatedDomainEvent)
export class EmailVerificationCreatedDomainEventHandler
  implements IEventHandler<EmailVerificationCreatedDomainEvent>
{
  private readonly logger = new CorrelationLogger(EmailVerificationCreatedDomainEventHandler.name);

  async handle(event: EmailVerificationCreatedDomainEvent): Promise<void> {
    this.logger.log('Email verification created', {
      userId: event.userId,
      email: event.email,
      expiresAt: event.expiresAt,
    });

    // Here you could:
    // - Send a verification email to the user
    // - Publish an integration event
    // - Update analytics
    // - etc.

    // For now, we just log the event
    this.logger.log('Email verification token created successfully', {
      userId: event.userId,
    });
  }
}
