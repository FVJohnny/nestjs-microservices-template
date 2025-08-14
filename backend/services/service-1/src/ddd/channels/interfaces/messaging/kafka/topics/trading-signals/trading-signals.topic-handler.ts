import { Injectable, Inject } from '@nestjs/common';
import { BaseTopicHandler } from '@libs/nestjs-ddd';
import type { EventListener } from '@libs/nestjs-ddd';
import { ChannelCreateEventHandler } from './events/channel-create.event-handler';

@Injectable()
export class TradingSignalsTopicHandler extends BaseTopicHandler {
  readonly topicName = 'trading-signals';

  constructor(
    @Inject('EventListener') private readonly eventListener: EventListener,
    private readonly channelCreateHandler: ChannelCreateEventHandler,
  ) {
    super();
  }

  async onModuleInit() {
    // Register all event handlers for this topic
    this.registerEventHandler(this.channelCreateHandler);
    
    // Register this topic handler with the pluggable event listener
    this.eventListener.registerTopicHandler(this);
    
    // Call parent initialization
    await super.onModuleInit();
    
    this.logger.log(
      `TradingSignalsTopicHandler registered with ${this.eventListener.constructor.name} - ` +
      `Handling events: ${this.getRegisteredEventNames().join(', ')}`
    );
  }
}
