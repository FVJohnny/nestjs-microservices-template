import { Inject } from '@nestjs/common';
import { type ICommandBus } from '@nestjs/cqrs';
import {
  COMMAND_BUS,
  IntegrationEventHandler,
  PasswordResetRequested_IntegrationEvent,
  CorrelationLogger,
} from '@libs/nestjs-common';
import { SendEmail_Command } from '@bc/notifications/application/commands';

@IntegrationEventHandler(PasswordResetRequested_IntegrationEvent)
export class PasswordResetRequested_IntegrationEventHandler {
  private readonly logger = new CorrelationLogger(
    PasswordResetRequested_IntegrationEventHandler.name,
  );

  constructor(@Inject(COMMAND_BUS) private readonly commandBus: ICommandBus) {}

  async handleEvent(event: PasswordResetRequested_IntegrationEvent) {
    this.logger.log(
      `📧 Password reset requested - sending reset email to ${event.email} (Reset ID: ${event.passwordResetId}, Expires: ${event.expiresAt})`,
    );

    const subject = 'Password reset requested';
    const expirationTime = new Date(event.expiresAt).toLocaleString();
    const message = `You have requested to reset your password. Please use the following reset ID: ${event.passwordResetId}. This link will expire at ${expirationTime}. If you did not request this, please ignore this email.`;

    const command = new SendEmail_Command({
      email: event.email,
      subject,
      message,
    });

    await this.commandBus.execute(command);
  }
}
