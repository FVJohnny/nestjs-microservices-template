import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { VerifyEmail_Command } from './verify-email.command';
import {
  EMAIL_VERIFICATION_REPOSITORY,
  type EmailVerification_Repository,
} from '@bc/auth/domain/repositories/email-verification/email-verification.repository';
import { BaseCommandHandler, NotFoundException } from '@libs/nestjs-common';
import { Id } from '@libs/nestjs-common';

@CommandHandler(VerifyEmail_Command)
export class VerifyEmail_CommandHandler extends BaseCommandHandler<VerifyEmail_Command> {
  constructor(
    @Inject(EMAIL_VERIFICATION_REPOSITORY)
    private readonly emailVerificationRepository: EmailVerification_Repository,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  protected async handle(command: VerifyEmail_Command) {
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

  protected async authorize(_command: VerifyEmail_Command) {
    return true;
  }

  protected async validate(_command: VerifyEmail_Command) {}
}
