import { CommandBus } from '@nestjs/cqrs';
import { IntegrationEventHandler, UserExample_IntegrationEvent } from '@libs/nestjs-common';
import { RegisterUser_Command } from '@bc/auth/application/commands';
import { CorrelationLogger } from '@libs/nestjs-common';
import { User } from '@bc/auth/domain/entities/user/user.entity';

@IntegrationEventHandler(UserExample_IntegrationEvent)
export class UserExample_IntegrationEventHandler {
  private readonly logger = new CorrelationLogger(UserExample_IntegrationEventHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  async handleEvent(_event: UserExample_IntegrationEvent) {
    try {
      // Generate random user data
      const user = User.random();
      const command = new RegisterUser_Command({
        email: user.email.toValue(),
        username: user.username.toValue(),
        password: 'password',
        role: user.role.toValue(),
      });
      await this.commandBus.execute(command);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to create example user via UserExample integration event: ${errorMessage}`,
      );
    }
  }
}
