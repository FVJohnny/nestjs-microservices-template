import { TradingSignalReceivedIntegrationEvent } from '@libs/nestjs-common';
import { IntegrationEventHandler } from '@libs/nestjs-common/dist/integration-events/integration-event-handler.decorator';
import { CommandBus } from '@nestjs/cqrs';
import { RegisterChannelCommand } from '../../application/commands/register-channel/register-channel.command';

@IntegrationEventHandler(TradingSignalReceivedIntegrationEvent)
export class TradingSignalsIntegrationEventHandler {
  constructor(
    private readonly commandBus: CommandBus,
  ) {}

  protected async handleEvent(
    event: TradingSignalReceivedIntegrationEvent,
    messageId: string,
  ): Promise<void> {

    // Execute the domain command
    const command = new RegisterChannelCommand({
      channelType: event.channelType,
      name: event.name,
      userId: event.userId,
      connectionConfig: event.connectionConfig,
    });

    const result = await this.commandBus.execute(command);

    console.log(
      `✅ Channel created successfully from trading-signals event [${messageId}] - Channel ID: ${result.id}`,
    );
  }
}
