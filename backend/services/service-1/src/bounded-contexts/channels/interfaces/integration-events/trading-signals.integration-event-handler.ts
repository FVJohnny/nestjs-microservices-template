import { Inject } from '@nestjs/common';
import {
  TradingSignalReceivedIntegrationEvent,
} from '@libs/nestjs-common';
import { IntegrationEventHandler } from '@libs/nestjs-common/dist/integration-events/integration-event-handler.decorator';
import type { RegisterChannelUseCase } from '../../application/use-cases/register-channel/register-channel.use-case';
import { RegisterChannelUseCaseProps } from '../../application/use-cases/register-channel/register-channel.request-response';

@IntegrationEventHandler(TradingSignalReceivedIntegrationEvent)
export class TradingSignalsIntegrationEventHandler {
  
  constructor(
    @Inject('RegisterChannelUseCase')
    private readonly registerChannelUseCase: RegisterChannelUseCase,
  ) {}

  protected async handleEvent(
    event: TradingSignalReceivedIntegrationEvent,
    messageId: string,
  ): Promise<void> {
    const request: RegisterChannelUseCaseProps = {
      channelType: event.channelType,
      name: event.name,
      userId: event.userId,
      connectionConfig: event.connectionConfig,
    };

    const response = await this.registerChannelUseCase.execute(request);

    console.log(
      `✅ Channel created successfully from trading-signals event [${messageId}] - Channel ID: ${response.channelId}`,
    );
  }
}
