// === MESSAGING ===
// Interfaces and Base Classes
export * from './messaging/interfaces/message-publisher.interface';
export * from './messaging/interfaces/kafka-publisher.interface';
export * from './messaging/interfaces/event-listener.interface';

export * from './messaging/interfaces/base-event.handler';

// Implementations
export * from './messaging/implementations/base-event.listener';
export * from './messaging/implementations/kafka-message.publisher';
export * from './messaging/implementations/redis-message.publisher';
export * from './messaging/implementations/kafka-event.listener';
export * from './messaging/implementations/redis-event.listener';

// Modules


// === DOMAIN ===
// Events
export * from './domain/events/domain-event.base';

// Repositories
export * from './domain/repositories/repository.base';

// === MODULE ===
export * from './ddd.module';

// === TOKENS ===
export const MESSAGE_PUBLISHER_TOKEN = 'MessagePublisher';
export const EVENT_LISTENER_TOKEN = 'EventListener';
