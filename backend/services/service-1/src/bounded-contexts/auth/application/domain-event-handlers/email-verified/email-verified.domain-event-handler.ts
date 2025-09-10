import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { EmailVerifiedDomainEvent } from '../../../domain/events/email-verified.domain-event';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user/user.repository';
import { TracingLogger, NotFoundException } from '@libs/nestjs-common';

@EventsHandler(EmailVerifiedDomainEvent)
export class EmailVerifiedDomainEventHandler implements IEventHandler<EmailVerifiedDomainEvent> {
  private readonly logger = new TracingLogger(EmailVerifiedDomainEventHandler.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async handle(event: EmailVerifiedDomainEvent): Promise<void> {
    this.logger.log('Handling EmailVerifiedDomainEvent...');

    const user = await this.userRepository.findById(event.userId);
    if (!user) {
      throw new NotFoundException('user');
    }

    user.verifyEmail();

    await this.userRepository.save(user);

    this.logger.log(`User ${user.id} email verification completed`);
  }
}
