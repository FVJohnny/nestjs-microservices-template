import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { EmailVerificationVerified_DomainEvent } from '@bc/auth/domain/events/email-verified.domain-event';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/repositories/user/user.repository';
import { CorrelationLogger, NotFoundException } from '@libs/nestjs-common';

@EventsHandler(EmailVerificationVerified_DomainEvent)
export class EmailVerificationVerified_UpdateUserStatus_DomainEventHandler
  implements IEventHandler<EmailVerificationVerified_DomainEvent>
{
  private readonly logger = new CorrelationLogger(
    EmailVerificationVerified_UpdateUserStatus_DomainEventHandler.name,
  );

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: User_Repository,
  ) {}

  async handle(event: EmailVerificationVerified_DomainEvent): Promise<void> {
    this.logger.log('Handling EmailVerificationVerifiedDomainEvent...');

    const user = await this.userRepository.findById(event.userId);
    if (!user) {
      throw new NotFoundException('user');
    }

    user.verifyEmail();

    await this.userRepository.save(user);

    this.logger.log(`User ${user.id} email verification completed`);
  }
}
