import { CommandBus } from '@nestjs/cqrs';
import { IntegrationEventHandler, UserExampleIntegrationEvent } from '@libs/nestjs-common';
import { RegisterUserCommand } from '@bc/auth/application/commands';
import { UserRoleEnum } from '@bc/auth/domain/value-objects';
import { CorrelationLogger } from '@libs/nestjs-common';

@IntegrationEventHandler(UserExampleIntegrationEvent)
export class UserExampleIntegrationEventHandler {
  private readonly logger = new CorrelationLogger(UserExampleIntegrationEventHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  async handleEvent(event: UserExampleIntegrationEvent): Promise<void> {
    this.logger.log(`Handling UserExample integration event: ${JSON.stringify(event.toJSON())}`);

    try {
      // Generate random user data
      const randomId = Math.floor(Math.random() * 10000);
      const command = new RegisterUserCommand({
        email: `example-user-${randomId}@demo.com`,
        username: `example_user_${randomId}`,
        password: 'password',
        role: UserRoleEnum.USER,
      });
      await this.commandBus.execute(command);

      this.logger.log(
        `✅ Created example user: ${command.email} (${command.username}) via UserExample integration event`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to create example user via UserExample integration event: ${errorMessage}`,
      );
      throw error;
    }
  }
}
