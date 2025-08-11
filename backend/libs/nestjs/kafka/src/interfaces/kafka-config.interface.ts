export interface KafkaModuleOptions {
  clientId: string;
  groupId: string;
  topics: string[];
  brokers?: string[];
  ssl?: boolean;
  sasl?: {
    mechanism: string;
    username: string;
    password: string;
  };
}

export interface KafkaMessageHandler {
  (payload: {
    topic: string;
    partition: number;
    message: {
      offset: string;
      value: string | null;
      timestamp: string;
    };
  }): Promise<void> | void;
}
