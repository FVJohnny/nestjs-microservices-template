import { Inject } from '@nestjs/common';
import { type ICommandBus } from '@nestjs/cqrs';
import { COMMAND_BUS } from '@libs/nestjs-common';
import { IntegrationEventHandler, UserExample_IntegrationEvent } from '@libs/nestjs-common';
import { RegisterUser_Command } from '@bc/auth/application/commands';
import { CorrelationLogger } from '@libs/nestjs-common';
import { User } from '@bc/auth/domain/aggregates/user/user.aggregate';

@IntegrationEventHandler(UserExample_IntegrationEvent)
export class UserExample_IntegrationEventHandler {
  private readonly logger = new CorrelationLogger(UserExample_IntegrationEventHandler.name);

  constructor(@Inject(COMMAND_BUS) private readonly commandBus: ICommandBus) {}

  async handleEvent(_event: UserExample_IntegrationEvent) {
    // Generate random user data
    const user = User.random();
    const command = new RegisterUser_Command({
      email: process.env.TEST_EMAIL || user.email.toValue(),
      username: user.username.toValue(),
      password: 'password',
    });
    await this.commandBus.execute(command);
  }
}
