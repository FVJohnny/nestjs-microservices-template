import { Injectable } from '@nestjs/common';
import { KafkaService } from '@libs/nestjs-kafka';
import { BaseTopicHandler } from '../../base/base-topic.handler';
import { ChannelCreateEventHandler } from './events/channel-create.event-handler';

@Injectable()
export class TradingSignalsTopicHandler extends BaseTopicHandler {
  readonly topicName = 'trading-signals';

  constructor(
    kafkaService: KafkaService,
    private readonly channelCreateHandler: ChannelCreateEventHandler,
  ) {
    super(kafkaService);
  }

  async onModuleInit() {
    // Register all event handlers for this topic
    this.registerEventHandler(this.channelCreateHandler);
    
    // Future event handlers would be registered here:
    // this.registerEventHandler(this.positionUpdatedHandler);

    // Call parent to register with Kafka service
    await super.onModuleInit();
  }
}
