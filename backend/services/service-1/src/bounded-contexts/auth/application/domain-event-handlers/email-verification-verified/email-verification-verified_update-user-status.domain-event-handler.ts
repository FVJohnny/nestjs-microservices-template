import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { EmailVerificationVerifiedDomainEvent } from '@bc/auth/domain/events/email-verified.domain-event';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@bc/auth/domain/repositories/user/user.repository';
import { CorrelationLogger, NotFoundException } from '@libs/nestjs-common';

@EventsHandler(EmailVerificationVerifiedDomainEvent)
export class EmailVerificationVerified_UpdateUserStatus_DomainEventHandler
  implements IEventHandler<EmailVerificationVerifiedDomainEvent>
{
  private readonly logger = new CorrelationLogger(
    EmailVerificationVerified_UpdateUserStatus_DomainEventHandler.name,
  );

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async handle(event: EmailVerificationVerifiedDomainEvent): Promise<void> {
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
