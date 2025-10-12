import { Inject } from '@nestjs/common';
import { type ICommandBus } from '@nestjs/cqrs';
import {
  COMMAND_BUS,
  IntegrationEventHandler,
  PasswordResetCompleted_IntegrationEvent,
  CorrelationLogger,
} from '@libs/nestjs-common';
import { SendEmail_Command } from '@bc/notifications/application/commands';

@IntegrationEventHandler(PasswordResetCompleted_IntegrationEvent)
export class PasswordResetCompleted_IntegrationEventHandler {
  private readonly logger = new CorrelationLogger(
    PasswordResetCompleted_IntegrationEventHandler.name,
  );

  constructor(@Inject(COMMAND_BUS) private readonly commandBus: ICommandBus) {}

  async handleEvent(event: PasswordResetCompleted_IntegrationEvent) {
    this.logger.log(
      `📧 Password reset completed - sending confirmation email to ${event.email} (User ID: ${event.userId})`,
    );

    const subject = 'Password changed successfully';
    const message = `Your password has been successfully changed. If you did not make this change, please contact support immediately to secure your account.`;

    const command = new SendEmail_Command({
      email: event.email,
      subject,
      message,
    });

    await this.commandBus.execute(command);
  }
}
