import { Injectable, Inject } from '@nestjs/common';
import {
  BaseIntegrationEventHandler,
  INTEGRATION_EVENT_LISTENER_TOKEN,
  TradingSignalReceivedIntegrationEvent,
  INTEGRATION_EVENT_TOPIC_TRADING_SIGNALS,
} from '@libs/nestjs-common';
import type { IntegrationEventListener } from '@libs/nestjs-common';
import type { RegisterChannelUseCase } from '../../application/use-cases/register-channel/register-channel.use-case';
import { RegisterChannelUseCaseProps } from '../../application/use-cases/register-channel/register-channel.request-response';

@Injectable()
export class TradingSignalsIntegrationEventHandler extends BaseIntegrationEventHandler<TradingSignalReceivedIntegrationEvent> {
  readonly topicName = INTEGRATION_EVENT_TOPIC_TRADING_SIGNALS;
  readonly eventClass = TradingSignalReceivedIntegrationEvent;

  constructor(
    @Inject(INTEGRATION_EVENT_LISTENER_TOKEN)
    eventListener: IntegrationEventListener,
    @Inject('RegisterChannelUseCase')
    private readonly registerChannelUseCase: RegisterChannelUseCase,
  ) {
    super(eventListener);
  }

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

    this.logger.log(
      `✅ Channel created successfully from trading-signals event [${messageId}] - Channel ID: ${response.channelId}`,
    );
  }
}
