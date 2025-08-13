export interface IKafkaPublisher {
  publishMessage(topic: string, message: any): Promise<void>;
  publishMessages(topic: string, messages: any[]): Promise<void>;
}