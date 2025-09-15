import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  CreateEmailVerificationCommand,
  CreateEmailVerificationCommandResponse,
} from './create-email-verification.command';
import {
  AlreadyExistsException,
  BaseCommandHandler,
  Id,
  NotFoundException,
} from '@libs/nestjs-common';
import { EmailVerification } from '@bc/auth/domain/entities/email-verification/email-verification.entity';
import { Email } from '@bc/auth/domain/value-objects';
import {
  EMAIL_VERIFICATION_REPOSITORY,
  type EmailVerificationRepository,
} from '@bc/auth/domain/repositories/email-verification/email-verification.repository';
import { USER_REPOSITORY } from '@bc/auth/domain/repositories/user/user.repository';
import type { UserRepository } from '@bc/auth/domain/repositories/user/user.repository';

@CommandHandler(CreateEmailVerificationCommand)
export class CreateEmailVerificationCommandHandler extends BaseCommandHandler<
  CreateEmailVerificationCommand,
  CreateEmailVerificationCommandResponse
> {
  constructor(
    @Inject(EMAIL_VERIFICATION_REPOSITORY)
    private readonly emailVerificationRepository: EmailVerificationRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  protected async handle(
    command: CreateEmailVerificationCommand,
  ): Promise<CreateEmailVerificationCommandResponse> {
    const userId = new Id(command.userId);
    const email = new Email(command.email);

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

  protected async validate(command: CreateEmailVerificationCommand): Promise<void> {
    const user = await this.userRepository.findById(new Id(command.userId));
    if (!user) {
      throw new NotFoundException('user');
    }
    // No validation needed - we'll remove existing verifications if they exist
    const existingVerificationByEmail = await this.emailVerificationRepository.findByEmail(
      new Email(command.email),
    );
    if (existingVerificationByEmail) {
      throw new AlreadyExistsException('email', command.email);
    }

    const existingVerificationByUserId = await this.emailVerificationRepository.findByUserId(
      new Id(command.userId),
    );
    if (existingVerificationByUserId) {
      throw new AlreadyExistsException('userId', command.userId);
    }
  }
}
