export class Topics {
  static readonly CHANNELS = {
    topic: "channels",
    events: {
      CHANNEL_CREATED: "channel.created",
    },
  };
  static readonly TRADING_SIGNALS = {
    topic: "trading-signals",
    events: {
      TRADING_SIGNAL_RECEIVED: "trading-signal.received",
    },
  };
  static readonly USERS = {
    topic: "users",
    events: {
      USER_CREATED: "user.created",
      USER_EXAMPLE: "user.example",
    },
  };
}
