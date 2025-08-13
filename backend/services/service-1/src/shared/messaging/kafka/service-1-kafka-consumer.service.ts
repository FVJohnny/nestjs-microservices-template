import { Injectable } from '@nestjs/common';
import { BaseKafkaConsumerService, KafkaConsumerConfig } from '@libs/nestjs-kafka';
import { TradingSignalsHandler } from '../../../channels/interfaces/messaging/kafka/handlers/trading-signals.handler';
import { UserEventsHandler } from '../../../channels/interfaces/messaging/kafka/handlers/user-events.handler';

@Injectable()
export class Service1KafkaConsumerService extends BaseKafkaConsumerService {
  
  constructor(
    private readonly tradingSignalsHandler: TradingSignalsHandler,
    private readonly userEventsHandler: UserEventsHandler,
    // Add more handlers as needed for future bounded contexts
  ) {
    // Service-1 specific configuration
    const config: KafkaConsumerConfig = {
      clientId: 'service-1-consumer',
      groupId: 'service-1-consumer-group',
      retryDelayMs: 5000,
    };
    
    super(config);
  }

  protected async registerHandlers(): Promise<void> {
    // Register all handlers for this service
    this.addHandler(this.tradingSignalsHandler);
    this.addHandler(this.userEventsHandler);
    
    // Future bounded contexts can add their handlers here:
    // this.addHandler(this.orderEventsHandler);
    // this.addHandler(this.paymentEventsHandler);
    
    this.logger.log(`🔍 Handler registration complete for Service-1. Registered ${this.handlerMap.size} handlers.`);
  }
}