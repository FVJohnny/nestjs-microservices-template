/**
 * Generic interface for publishing messages to external systems.
 * This allows for multiple implementations (Kafka, Redis, RabbitMQ, etc.)
 * following the Dependency Inversion Principle.
 */
export interface MessagePublisher {
  /**
   * Publishes a message to the specified topic/channel
   * @param topic - The topic or channel to publish to
   * @param message - The message payload to publish
   */
  publish(topic: string, message: any): Promise<void>;

  /**
   * Publishes multiple messages to the specified topic/channel
   * @param topic - The topic or channel to publish to
   * @param messages - Array of message payloads to publish
   */
  publishBatch?(topic: string, messages: any[]): Promise<void>;
}

/**
 * Message metadata interface for structured messaging
 */
export interface MessageMetadata {
  eventId: string;
  eventName: string;
  aggregateId?: string;
  timestamp: string;
  version?: number;
  correlationId?: string;
  causationId?: string;
}
