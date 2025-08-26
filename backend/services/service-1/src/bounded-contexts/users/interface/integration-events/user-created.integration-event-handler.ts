import { Logger } from '@nestjs/common';
import { IntegrationEventHandler, UserCreatedIntegrationEvent } from '@libs/nestjs-common';

@IntegrationEventHandler(UserCreatedIntegrationEvent)
export class UserCreatedIntegrationEventHandler {
  private readonly logger = new Logger(UserCreatedIntegrationEventHandler.name);

  async handleEvent(event: UserCreatedIntegrationEvent, messageId: string): Promise<void> {
    this.logger.log(`Handling UserCreated integration event [${messageId}]: ${JSON.stringify(event.payload)}`);
    
  }
}