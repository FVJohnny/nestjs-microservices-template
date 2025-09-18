import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { DeleteEmailVerificationByUserId_Command } from './delete-email-verification-by-user-id.command';
import {
  EMAIL_VERIFICATION_REPOSITORY,
  type EmailVerification_Repository,
} from '@bc/auth/domain/repositories/email-verification/email-verification.repository';
import { BaseCommandHandler, Id, NotFoundException } from '@libs/nestjs-common';

@CommandHandler(DeleteEmailVerificationByUserId_Command)
export class DeleteEmailVerificationByUserId_CommandHandler extends BaseCommandHandler<DeleteEmailVerificationByUserId_Command> {
  constructor(
    @Inject(EMAIL_VERIFICATION_REPOSITORY)
    private readonly emailVerificationRepository: EmailVerification_Repository,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  protected async handle(command: DeleteEmailVerificationByUserId_Command) {
    const userId = new Id(command.userId);

    const verification = await this.emailVerificationRepository.findByUserId(userId);
    if (!verification) {
      throw new NotFoundException('email verification');
    }

    await this.emailVerificationRepository.remove(verification.id);
  }

  protected async authorize(_command: DeleteEmailVerificationByUserId_Command) {
    return true;
  }

  protected async validate(_command: DeleteEmailVerificationByUserId_Command) {}
}
