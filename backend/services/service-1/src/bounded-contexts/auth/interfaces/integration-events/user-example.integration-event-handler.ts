import { CommandBus } from '@nestjs/cqrs';
import { IntegrationEventHandler, UserExampleIntegrationEvent } from '@libs/nestjs-common';
import { RegisterUserCommand } from '@bc/auth/application/commands';
import { UserRoleEnum } from '@bc/auth/domain/value-objects';
import { CorrelationLogger } from '@libs/nestjs-common';
import { User } from '@bc/auth/domain/entities/user/user.entity';

@IntegrationEventHandler(UserExampleIntegrationEvent)
export class UserExampleIntegrationEventHandler {
  private readonly logger = new CorrelationLogger(UserExampleIntegrationEventHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  async handleEvent(event: UserExampleIntegrationEvent): Promise<void> {
    this.logger.log(`Handling UserExample integration event: ${JSON.stringify(event.toJSON())}`);

    try {
      // Generate random user data
      const user = User.random();
      const command = new RegisterUserCommand({
        email: user.email.toValue(),
        username: user.username.toValue(),
        password: 'password',
        role: user.role.toValue(),
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
