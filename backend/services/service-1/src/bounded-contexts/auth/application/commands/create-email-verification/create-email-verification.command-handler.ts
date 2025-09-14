import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  CreateEmailVerificationCommand,
  CreateEmailVerificationCommandResponse,
} from './create-email-verification.command';
import { BaseCommandHandler, Id } from '@libs/nestjs-common';
import { EmailVerification } from '@bc/auth/domain/entities/email-verification/email-verification.entity';
import { Email } from '@bc/auth/domain/value-objects';
import {
  EMAIL_VERIFICATION_REPOSITORY,
  type EmailVerificationRepository,
} from '@bc/auth/domain/repositories/email-verification/email-verification.repository';

@CommandHandler(CreateEmailVerificationCommand)
export class CreateEmailVerificationCommandHandler extends BaseCommandHandler<
  CreateEmailVerificationCommand,
  CreateEmailVerificationCommandResponse
> {
  constructor(
    @Inject(EMAIL_VERIFICATION_REPOSITORY)
    private readonly emailVerificationRepository: EmailVerificationRepository,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  protected async handle(
    command: CreateEmailVerificationCommand,
  ): Promise<CreateEmailVerificationCommandResponse> {
    const userId = new Id(command.userId);
    const email = new Email(command.email);
    // Delete any existing verifications before creating new one
    await this.removeExistingVerifications(userId, email);

    const emailVerification = EmailVerification.create({
      userId,
      email,
    });

    await this.emailVerificationRepository.save(emailVerification);

    await this.sendDomainEvents<EmailVerification>(emailVerification);

    return {
      id: emailVerification.id.toValue(),
    };
  }

  protected authorize(_command: CreateEmailVerificationCommand): Promise<boolean> {
    // TODO: Implement authorization logic if needed
    return Promise.resolve(true);
  }

  protected async validate(_command: CreateEmailVerificationCommand): Promise<void> {
    // No validation needed - we'll remove existing verifications if they exist
  }

  /**
   * Remove any existing email verifications for the same user or email
   */
  private async removeExistingVerifications(userId: Id, email: Email): Promise<void> {
    const existingVerificationByUserId =
      await this.emailVerificationRepository.findByUserId(userId);
    if (existingVerificationByUserId) {
      await this.emailVerificationRepository.remove(existingVerificationByUserId.id);
    }

    // Remove existing verification for this email (if different from user's verification)
    const existingVerificationByEmail = await this.emailVerificationRepository.findByEmail(email);
    if (existingVerificationByEmail) {
      await this.emailVerificationRepository.remove(existingVerificationByEmail.id);
    }
  }
}
