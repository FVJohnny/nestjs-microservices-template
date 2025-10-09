import { type IEventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RequestPasswordReset_Command } from './request-password-reset.command';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/aggregates/user/user.repository';
import {
  PASSWORD_RESET_REPOSITORY,
  type PasswordReset_Repository,
} from '@bc/auth/domain/aggregates/password-reset/password-reset.repository';
import { PasswordReset } from '@bc/auth/domain/aggregates/password-reset/password-reset.aggregate';
import { Email } from '@bc/auth/domain/value-objects';
import {
  Base_CommandHandler,
  EVENT_BUS,
  OUTBOX_REPOSITORY,
  type Outbox_Repository,
  PasswordResetRequested_IntegrationEvent,
  type RepositoryContext,
  OutboxTopic,
  OutboxEvent,
  OutboxEventName,
  OutboxPayload,
  Transaction,
} from '@libs/nestjs-common';

export class RequestPasswordReset_CommandHandler extends Base_CommandHandler(
  RequestPasswordReset_Command,
) {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: User_Repository,
    @Inject(PASSWORD_RESET_REPOSITORY)
    private readonly passwordResetRepository: PasswordReset_Repository,
    @Inject(OUTBOX_REPOSITORY)
    private readonly outboxRepository: Outbox_Repository,
    @Inject(EVENT_BUS)
    eventBus: IEventBus,
  ) {
    super(eventBus);
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

    await Transaction.run(async (context) => {
      await this.passwordResetRepository.save(passwordReset, context);
      await this.sendIntegrationEvent(passwordReset, context);
      await this.sendDomainEvents<PasswordReset>(passwordReset);
    });
  }

  private async sendIntegrationEvent(passwordReset: PasswordReset, context: RepositoryContext) {
    const integrationEvent = new PasswordResetRequested_IntegrationEvent({
      email: passwordReset.email.toValue(),
      passwordResetId: passwordReset.id.toValue(),
      expiresAt: passwordReset.expiration.toValue(),
    });

    const event = OutboxEvent.create({
      eventName: new OutboxEventName(PasswordResetRequested_IntegrationEvent.name),
      topic: new OutboxTopic(PasswordResetRequested_IntegrationEvent.topic),
      payload: new OutboxPayload(integrationEvent.toJSONString()),
    });
    await this.outboxRepository.save(event, context);
  }

  async authorize(_command: RequestPasswordReset_Command) {
    return true;
  }

  async validate(_command: RequestPasswordReset_Command) {}
}
