import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ProcessSignalCommand } from './process-signal.command';
import type { ChannelRepository } from '../../domain/repositories/channel.repository';
import { CorrelationLogger } from '@libs/nestjs-common';

@CommandHandler(ProcessSignalCommand)
export class ProcessSignalHandler implements ICommandHandler<ProcessSignalCommand> {
  private readonly logger = new CorrelationLogger(ProcessSignalHandler.name);

  constructor(
    @Inject('ChannelRepository')
    private readonly channelRepository: ChannelRepository,
  ) {}

  async execute(command: ProcessSignalCommand): Promise<void> {
    const { channelId, signalType, signalData } = command;

    this.logger.log(`Processing signal for channel ${channelId} - Type: ${signalType}, Symbol: ${signalData.symbol}, Action: ${signalData.action}`);

    const channel = await this.channelRepository.findById(channelId);
    
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    if (!channel.isActive) {
      this.logger.warn(`Channel ${channelId} is not active, skipping signal`);
      return;
    }

    const formattedMessage = this.formatSignalMessage(signalType, signalData);
    
    this.logger.log(`Signal processed successfully for channel ${channelId} (${channel.channelType})`);

    this.logger.log(`Signal would be sent to channel: ${channel.name} (${channel.channelType}) for user ${channel.userId}`);
  }

  private formatSignalMessage(signalType: string, signalData: any): string {
    const { symbol, action, price, stopLoss, takeProfit, confidence } = signalData;
    
    let message = `🚨 ${signalType} Signal\n`;
    message += `📊 Symbol: ${symbol}\n`;
    message += `🎯 Action: ${action}\n`;
    
    if (price) message += `💰 Price: $${price}\n`;
    if (stopLoss) message += `🛑 Stop Loss: $${stopLoss}\n`;
    if (takeProfit) message += `✅ Take Profit: $${takeProfit}\n`;
    if (confidence) message += `📈 Confidence: ${confidence}%\n`;
    
    message += `⏰ Time: ${new Date(signalData.timestamp).toISOString()}`;
    
    return message;
  }
}