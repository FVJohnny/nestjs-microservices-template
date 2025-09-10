import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { VerifyEmailCommand, VerifyEmailCommandResponse } from './verify-email.command';
import {
  EMAIL_VERIFICATION_REPOSITORY,
  type EmailVerificationRepository,
} from '../../../domain/repositories/email-verification/email-verification.repository';
import { BaseCommandHandler, NotFoundException } from '@libs/nestjs-common';

@CommandHandler(VerifyEmailCommand)
export class VerifyEmailCommandHandler extends BaseCommandHandler<
  VerifyEmailCommand,
  VerifyEmailCommandResponse
> {
  constructor(
    @Inject(EMAIL_VERIFICATION_REPOSITORY)
    private readonly emailVerificationRepository: EmailVerificationRepository,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  protected async handle(command: VerifyEmailCommand): Promise<VerifyEmailCommandResponse> {
    // Find pending email verification by token
    const emailVerification = await this.emailVerificationRepository.findPendingByToken(
      command.token,
    );

    if (!emailVerification) {
      throw new NotFoundException('email verification');
    }

    emailVerification.verify();

    await this.emailVerificationRepository.save(emailVerification);

    await this.sendDomainEvents(emailVerification);

    return {
      success: true,
      userId: emailVerification.userId,
    };
  }

  protected authorize(_command: VerifyEmailCommand): Promise<boolean> {
    // No special authorization needed - anyone with a valid token can verify
    return Promise.resolve(true);
  }

  protected async validate(_command: VerifyEmailCommand): Promise<void> {
    // Token validation is done in the handle method
  }
}
