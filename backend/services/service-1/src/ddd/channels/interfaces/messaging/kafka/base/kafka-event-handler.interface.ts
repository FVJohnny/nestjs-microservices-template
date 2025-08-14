export interface KafkaEventHandler {
  readonly eventName: string;
  handle(payload: Record<string, unknown>, messageId: string): Promise<void>;
}

export interface KafkaTopicEventRouter {
  readonly topicName: string;
  registerEventHandler(handler: KafkaEventHandler): void;
  routeEvent(eventName: string, payload: Record<string, unknown>, messageId: string): Promise<void>;
}
