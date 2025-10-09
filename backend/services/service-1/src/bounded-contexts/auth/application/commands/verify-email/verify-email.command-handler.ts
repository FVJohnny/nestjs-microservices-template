import { type IEventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { VerifyEmail_Command } from './verify-email.command';
import {
  EMAIL_VERIFICATION_REPOSITORY,
  type EmailVerification_Repository,
} from '@bc/auth/domain/aggregates/email-verification/email-verification.repository';
import { Base_CommandHandler, EVENT_BUS, NotFoundException } from '@libs/nestjs-common';
import { Id } from '@libs/nestjs-common';

export class VerifyEmail_CommandHandler extends Base_CommandHandler(VerifyEmail_Command) {
  constructor(
    @Inject(EMAIL_VERIFICATION_REPOSITORY)
    private readonly emailVerificationRepository: EmailVerification_Repository,
    @Inject(EVENT_BUS)
    eventBus: IEventBus,
  ) {
    super(eventBus);
  }

  async handle(command: VerifyEmail_Command) {
    const emailVerification = await this.emailVerificationRepository.findById(
      new Id(command.emailVerificationId),
    );

    if (!emailVerification) {
      throw new NotFoundException('email verification');
    }

    emailVerification.verify();

    await this.emailVerificationRepository.save(emailVerification);

    await this.sendDomainEvents(emailVerification);
  }

  async authorize(_command: VerifyEmail_Command) {
    return true;
  }

  async validate(_command: VerifyEmail_Command) {}
}
