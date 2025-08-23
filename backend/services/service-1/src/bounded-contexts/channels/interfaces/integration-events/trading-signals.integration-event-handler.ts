import { Injectable, Inject } from '@nestjs/common';
import {
  BaseIntegrationEventHandler,
  INTEGRATION_EVENT_LISTENER_TOKEN,
} from '@libs/nestjs-common';
import type { IntegrationEventListener } from '@libs/nestjs-common';
import type { RegisterChannelUseCase } from '../../application/use-cases/register-channel/register-channel.use-case';
import { RegisterChannelUseCaseProps } from '../../application/use-cases/register-channel/register-channel.request-response';

const INTEGRATION_EVENT_TOPIC_TRADING_SIGNALS = 'trading-signals';

@Injectable()
export class TradingSignalsIntegrationEventHandler extends BaseIntegrationEventHandler {
  readonly topicName = INTEGRATION_EVENT_TOPIC_TRADING_SIGNALS;

  constructor(
    @Inject(INTEGRATION_EVENT_LISTENER_TOKEN)
    eventListener: IntegrationEventListener,
    @Inject('RegisterChannelUseCase')
    private readonly registerChannelUseCase: RegisterChannelUseCase,
  ) {
    super(eventListener);
  }

  async handle(
    payload: Record<string, unknown>,
    messageId: string,
  ): Promise<void> {
    this.logger.log(
      `Processing trading-signals event [${messageId}]`,
    );

    const request: RegisterChannelUseCaseProps = {
      channelType: payload.channelType as string,
      name: payload.name as string,
      userId: payload.userId as string,
      connectionConfig: (payload.connectionConfig as Record<string, unknown>) || {},
    };

    const response = await this.registerChannelUseCase.execute(request);

    this.logger.log(
      `✅ Channel created successfully from trading-signals event [${messageId}] - Channel ID: ${response.channelId}`,
    );
  }
}
