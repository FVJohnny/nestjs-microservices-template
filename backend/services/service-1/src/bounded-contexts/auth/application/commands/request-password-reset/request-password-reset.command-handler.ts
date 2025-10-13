import { PasswordReset } from '@bc/auth/domain/aggregates/password-reset/password-reset.aggregate';
import {
  PASSWORD_RESET_REPOSITORY,
  type PasswordReset_Repository,
} from '@bc/auth/domain/aggregates/password-reset/password-reset.repository';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/aggregates/user/user.repository';
import { Email } from '@bc/auth/domain/value-objects';
import {
  Base_CommandHandler,
  EVENT_BUS,
  Id,
  OUTBOX_REPOSITORY,
  type Outbox_Repository,
  PasswordResetRequested_IntegrationEvent,
  Transaction,
} from '@libs/nestjs-common';
import { Inject } from '@nestjs/common';
import { type IEventBus } from '@nestjs/cqrs';
import { RequestPasswordReset_Command } from './request-password-reset.command';

export class RequestPasswordReset_CommandHandler extends Base_CommandHandler(
  RequestPasswordReset_Command,
) {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: User_Repository,
    @Inject(PASSWORD_RESET_REPOSITORY)
    private readonly passwordResetRepository: PasswordReset_Repository,
    @Inject(EVENT_BUS)
    eventBus: IEventBus,
    @Inject(OUTBOX_REPOSITORY)
    outboxRepository: Outbox_Repository,
  ) {
    super(eventBus, outboxRepository);
  }

  async handle(command: RequestPasswordReset_Command) {
    const email = new Email(command.email);

    // Check if user exists
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security reasons
      // Just return silently
      return;
    }

    // Check if a valid password reset already exists for this email
    const existingPasswordReset = await this.passwordResetRepository.findValidByEmail(email);
    if (existingPasswordReset) {
      // A valid password reset already exists, do nothing
      return;
    }

    // Create new password reset
    const passwordReset = PasswordReset.create({
      email: user.email,
    });

    // Create integration event to be sent
    const integrationEvent = new PasswordResetRequested_IntegrationEvent({
      id: Id.random().toValue(),
      occurredOn: new Date(),
      email: passwordReset.email.toValue(),
      passwordResetId: passwordReset.id.toValue(),
      expiresAt: passwordReset.expiration.toValue(),
    });

    await Transaction.run(async (context) => {
      await this.passwordResetRepository.save(passwordReset, context);
      await this.sendIntegrationEvent(integrationEvent, context);
      await this.sendDomainEvents<PasswordReset>(passwordReset);
    });
  }

  async authorize(_command: RequestPasswordReset_Command) {
    return true;
  }

  async validate(_command: RequestPasswordReset_Command) {}
}
