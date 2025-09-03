export interface KafkaMessagePayload {
  topic: string;
  partition: number;
  message: {
    offset: string;
    value: string | null;
    timestamp: string;
    key?: string | null;
  };
}

export interface KafkaTopicStats {
  topic: string;
  handlerName: string;
  messagesProcessed: number;
  messagesSucceeded: number;
  messagesFailed: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  lastProcessedAt?: Date;
}

export interface KafkaConsumerStats {
  consumerId: string;
  handlerCount: number;
  topics: string[];
  handlers: KafkaTopicStats[];
  totalMessages: number;
  totalSuccesses: number;
  totalFailures: number;
  uptime: number;
  startedAt: Date;
}