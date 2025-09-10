import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  CreateEmailVerificationCommand,
  CreateEmailVerificationCommandResponse,
} from './create-email-verification.command';
import { BaseCommandHandler, AlreadyExistsException } from '@libs/nestjs-common';
import { EmailVerification } from '../../../domain/entities/email-verification/email-verification.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import {
  EMAIL_VERIFICATION_REPOSITORY,
  type EmailVerificationRepository,
} from '../../../domain/repositories/email-verification/email-verification.repository';

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
    const emailVerification = EmailVerification.create({
      userId: command.userId,
      email: new Email(command.email),
    });

    await this.emailVerificationRepository.save(emailVerification);

    await this.sendDomainEvents<EmailVerification>(emailVerification);

    return {
      id: emailVerification.id,
      token: emailVerification.token,
    };
  }

  protected authorize(_command: CreateEmailVerificationCommand): Promise<boolean> {
    // TODO: Implement authorization logic if needed
    return Promise.resolve(true);
  }

  protected async validate(command: CreateEmailVerificationCommand): Promise<void> {
    // Check if user already has an email verification
    const existingVerification = await this.emailVerificationRepository.findByUserId(
      command.userId,
    );
    if (existingVerification) {
      throw new AlreadyExistsException('userId', command.userId);
    }
  }
}
