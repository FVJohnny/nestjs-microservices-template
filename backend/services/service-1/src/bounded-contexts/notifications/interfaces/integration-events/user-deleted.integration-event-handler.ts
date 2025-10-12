import { Inject } from '@nestjs/common';
import { type ICommandBus } from '@nestjs/cqrs';
import {
  COMMAND_BUS,
  IntegrationEventHandler,
  UserDeleted_IntegrationEvent,
  CorrelationLogger,
} from '@libs/nestjs-common';
import { SendEmail_Command } from '@bc/notifications/application/commands';

@IntegrationEventHandler(UserDeleted_IntegrationEvent)
export class UserDeleted_IntegrationEventHandler {
  private readonly logger = new CorrelationLogger(UserDeleted_IntegrationEventHandler.name);

  constructor(@Inject(COMMAND_BUS) private readonly commandBus: ICommandBus) {}

  async handleEvent(event: UserDeleted_IntegrationEvent) {
    this.logger.log(
      `📧 User deleted - sending goodbye email to ${event.email} (User ID: ${event.userId}, Username: ${event.username})`,
    );

    const subject = 'Your account has been deleted';
    const message = `Hello ${event.username}, we're sorry to see you go! Your account has been successfully deleted. We hope to see you again in the future. If this was a mistake, please contact our support team.`;

    const command = new SendEmail_Command({
      email: event.email,
      subject,
      message,
    });

    await this.commandBus.execute(command);
  }
}
