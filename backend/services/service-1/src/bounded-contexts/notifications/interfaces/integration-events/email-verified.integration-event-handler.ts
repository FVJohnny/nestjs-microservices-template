import { Inject } from '@nestjs/common';
import { type ICommandBus } from '@nestjs/cqrs';
import {
  COMMAND_BUS,
  IntegrationEventHandler,
  EmailVerified_IntegrationEvent,
  CorrelationLogger,
} from '@libs/nestjs-common';
import { SendEmail_Command } from '@bc/notifications/application/commands';

@IntegrationEventHandler(EmailVerified_IntegrationEvent)
export class EmailVerified_IntegrationEventHandler {
  private readonly logger = new CorrelationLogger(EmailVerified_IntegrationEventHandler.name);

  constructor(@Inject(COMMAND_BUS) private readonly commandBus: ICommandBus) {}

  async handleEvent(event: EmailVerified_IntegrationEvent) {
    this.logger.log(
      `📧 Email verified - sending confirmation email to ${event.email} (User ID: ${event.userId}, Verification ID: ${event.emailVerificationId})`,
    );

    const subject = 'Email address verified successfully';
    const message = `Thank you for verifying your email address! Your account is now fully activated and you can enjoy all features of our platform.`;

    const command = new SendEmail_Command({
      email: event.email,
      subject,
      message,
    });

    await this.commandBus.execute(command);
  }
}
