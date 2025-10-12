import { Inject } from '@nestjs/common';
import { type ICommandBus } from '@nestjs/cqrs';
import {
  COMMAND_BUS,
  IntegrationEventHandler,
  EmailVerificationCreated_IntegrationEvent,
  CorrelationLogger,
} from '@libs/nestjs-common';
import { SendEmail_Command } from '@bc/notifications/application/commands';

@IntegrationEventHandler(EmailVerificationCreated_IntegrationEvent)
export class EmailVerificationCreated_IntegrationEventHandler {
  private readonly logger = new CorrelationLogger(
    EmailVerificationCreated_IntegrationEventHandler.name,
  );

  constructor(@Inject(COMMAND_BUS) private readonly commandBus: ICommandBus) {}

  async handleEvent(event: EmailVerificationCreated_IntegrationEvent) {
    this.logger.log(
      `📧 Email verification created - sending verification email to ${event.email} (User ID: ${event.userId}, Verification ID: ${event.emailVerificationId}, Expires: ${event.expiresAt})`,
    );

    const subject = 'Please verify your email address';
    const expirationTime = new Date(event.expiresAt).toLocaleString();
    const message = `Please verify your email address by clicking the verification link. This link will expire at ${expirationTime}. Your verification ID is: ${event.emailVerificationId}`;

    const command = new SendEmail_Command({
      email: event.email,
      subject,
      message,
    });

    await this.commandBus.execute(command);
  }
}
