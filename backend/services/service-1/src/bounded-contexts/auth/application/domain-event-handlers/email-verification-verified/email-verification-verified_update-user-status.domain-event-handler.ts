import { Inject } from '@nestjs/common';
import { EmailVerificationVerified_DomainEvent } from '@bc/auth/domain/events/email-verified.domain-event';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/repositories/user/user.repository';
import { Base_DomainEventHandler, NotFoundException } from '@libs/nestjs-common';

export class EmailVerificationVerified_UpdateUserStatus_DomainEventHandler extends Base_DomainEventHandler(
  EmailVerificationVerified_DomainEvent,
) {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: User_Repository) {
    super();
  }

  async handleEvent(event: EmailVerificationVerified_DomainEvent) {
    const user = await this.userRepository.findById(event.userId);
    if (!user) {
      throw new NotFoundException('user');
    }

    user.verifyEmail();

    await this.userRepository.save(user);

    this.logger.log(`User ${user.id} email verification completed`);
  }
}
