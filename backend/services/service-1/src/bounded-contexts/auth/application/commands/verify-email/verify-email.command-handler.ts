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
export class VerifyEmail_CommandHandler extends BaseCommandHandler<VerifyEmail_Command, void> {
  constructor(
    @Inject(EMAIL_VERIFICATION_REPOSITORY)
    private readonly emailVerificationRepository: EmailVerification_Repository,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  protected async handle(command: VerifyEmail_Command): Promise<void> {
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

  protected authorize(_command: VerifyEmail_Command): Promise<boolean> {
    // No special authorization needed - anyone with a valid email verification ID can verify
    return Promise.resolve(true);
  }

  protected async validate(_command: VerifyEmail_Command): Promise<void> {
    // Email verification validation is done in the handle method
  }
}
