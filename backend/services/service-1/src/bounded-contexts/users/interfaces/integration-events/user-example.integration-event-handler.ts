import { Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IntegrationEventHandler, UserExampleIntegrationEvent } from '@libs/nestjs-common';
import { RegisterUserCommand } from '../../application/commands';
import { UserRoleEnum } from '../../domain/value-objects/user-role.vo';

@IntegrationEventHandler(UserExampleIntegrationEvent)
export class UserExampleIntegrationEventHandler {
  private readonly logger = new Logger(UserExampleIntegrationEventHandler.name);

  constructor(
    private readonly commandBus: CommandBus,
  ) {}

  async handleEvent(event: UserExampleIntegrationEvent, messageId: string): Promise<void> {
    this.logger.log(`Handling UserExample integration event [${messageId}]: ${JSON.stringify(event.toJSON())}`);
    
    try {
      // Generate random user data
      const randomId = Math.floor(Math.random() * 10000);
      const command = new RegisterUserCommand({
        email: `example-user-${randomId}@demo.com`,
        username: `example_user_${randomId}`,
        firstName: this.getRandomFirstName(),
        lastName: this.getRandomLastName(),
        role: UserRoleEnum.USER
      });
      await this.commandBus.execute(command);
      
      this.logger.log(`✅ Created example user: ${command.email} (${command.firstName} ${command.lastName}) via UserExample integration event [${messageId}]`);
    } catch (error) {
      this.logger.error(`❌ Failed to create example user via UserExample integration event [${messageId}]: ${error.message}`);
      throw error;
    }
  }

  private getRandomFirstName(): string {
    const firstNames = [
      'Alice', 'Bob', 'Charlie', 'Diana', 'Edward', 'Fiona', 
      'George', 'Hannah', 'Ian', 'Julia', 'Kevin', 'Laura',
      'Michael', 'Nancy', 'Oliver', 'Patricia', 'Quinn', 'Rachel'
    ];
    return firstNames[Math.floor(Math.random() * firstNames.length)];
  }

  private getRandomLastName(): string {
    const lastNames = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia',
      'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez',
      'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore'
    ];
    return lastNames[Math.floor(Math.random() * lastNames.length)];
  }
}