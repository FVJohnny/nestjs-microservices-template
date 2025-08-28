import { TradingSignalReceivedIntegrationEvent } from '@libs/nestjs-common';
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
      channelType: 'telegram',
      name: 'Channel from event',
      userId: 'user-id',
      connectionConfig: {},
    });

    const result = await this.commandBus.execute(command);

    console.log(
      `✅ Channel created successfully from trading-signals event [${messageId}] - Channel ID: ${result.id}`,
    );
  }
}
