import { type IEventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateEmailVerification_Command } from './create-email-verification.command';
import { AlreadyExistsException, Base_CommandHandler, EVENT_BUS, Id } from '@libs/nestjs-common';
import { EmailVerification } from '@bc/auth/domain/entities/email-verification/email-verification.entity';
import { Email } from '@bc/auth/domain/value-objects';
import {
  EMAIL_VERIFICATION_REPOSITORY,
  type EmailVerification_Repository,
} from '@bc/auth/domain/repositories/email-verification/email-verification.repository';
import { USER_REPOSITORY } from '@bc/auth/domain/repositories/user/user.repository';
import type { User_Repository } from '@bc/auth/domain/repositories/user/user.repository';

export class CreateEmailVerification_CommandHandler extends Base_CommandHandler(
  CreateEmailVerification_Command,
) {
  constructor(
    @Inject(EMAIL_VERIFICATION_REPOSITORY)
    private readonly emailVerificationRepository: EmailVerification_Repository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: User_Repository,
    @Inject(EVENT_BUS)
    eventBus: IEventBus,
  ) {
    super(eventBus);
  }

  async handle(command: CreateEmailVerification_Command) {
    const userId = new Id(command.userId);
    const email = new Email(command.email);

    const emailVerification = EmailVerification.create({
      userId,
      email,
    });

    await this.emailVerificationRepository.save(emailVerification);

    await this.sendDomainEvents<EmailVerification>(emailVerification);
  }

  async authorize(_command: CreateEmailVerification_Command) {
    return true;
  }

  async validate(command: CreateEmailVerification_Command) {
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
