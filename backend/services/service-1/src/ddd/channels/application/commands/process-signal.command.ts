export class ProcessSignalCommand {
  constructor(
    public readonly channelId: string,
    public readonly signalType: string,
    public readonly signalData: {
      symbol: string;
      action: 'BUY' | 'SELL' | 'HOLD';
      price?: number;
      stopLoss?: number;
      takeProfit?: number;
      confidence?: number;
      timestamp: Date;
    },
  ) {}
}