import { Inject } from '@nestjs/common';
import { type ICommandBus } from '@nestjs/cqrs';
import { COMMAND_BUS } from '@libs/nestjs-common';
import { IntegrationEventHandler, UserCreated_IntegrationEvent } from '@libs/nestjs-common';
import { CorrelationLogger } from '@libs/nestjs-common';
import { SendEmail_Command } from '@bc/notifications/application/commands';

@IntegrationEventHandler(UserCreated_IntegrationEvent)
export class UserCreated_IntegrationEventHandler {
  private readonly logger = new CorrelationLogger(UserCreated_IntegrationEventHandler.name);

  constructor(@Inject(COMMAND_BUS) private readonly commandBus: ICommandBus) {}

  async handleEvent(event: UserCreated_IntegrationEvent) {
    this.logger.log(
      `📧 New user registered - sending welcome notification to ${event.email} (User ID: ${event.userId}, Username: ${event.username}, Role: ${event.role})`,
    );

    const subject = 'Welcome to our platform!';
    const message = `Welcome to our platform, ${event.username}! We're excited to have you on board.`;

    const command = new SendEmail_Command({
      email: event.email,
      subject,
      message,
    });

    await this.commandBus.execute(command);
  }
}
