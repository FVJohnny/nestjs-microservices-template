/**
 * Generic Kafka message handler type definition
 * Used for internal message routing
 */
export interface KafkaGenericHandler {
  topicName: string;
  handle: (message: unknown) => Promise<void>;
}

/**
 * Kafka message structure
 */
export interface KafkaMessage {
  topic: string;
  partition: number;
  message: KafkaMessageInternal;
}

export interface KafkaMessageInternal {
  offset: string;
  value: Buffer | string;
  timestamp: string;
  key: Buffer | string;
}


