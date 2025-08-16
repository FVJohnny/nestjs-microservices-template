/**
 * Generic event payload format that all event sources are normalized to
 */
export interface EventPayload {
  messageId: string;
  eventName: string;
  data: Record<string, unknown>;
  timestamp: Date;
  source: string;
}

/**
 * Generic event handler interface for handling specific event types
 * Works with any event source (Kafka, Redis, etc.)
 */
export interface EventHandler {
  readonly topicName: string;
  handle(payload: Record<string, unknown>, messageId: string): Promise<void>;
}

/**
 * Generic event listener interface that can be implemented for different event sources
 */
export interface EventListener {
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  isListening(): boolean;
  registerEventHandler(topicName: string, handler: EventHandler): Promise<void>;
}
