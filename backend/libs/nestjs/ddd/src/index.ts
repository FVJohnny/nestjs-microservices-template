// === MESSAGING ===
// Interfaces and Base Classes
export * from './messaging/interfaces/event-publisher.interface';
export * from './messaging/interfaces/kafka-publisher.interface';
export * from './messaging/interfaces/event-listener.interface';

export * from './messaging/interfaces/base-event.handler';

// Implementations
export * from './messaging/implementations/base-event.listener';
export * from './messaging/implementations/kafka-event.publisher';
export * from './messaging/implementations/redis-event.publisher';
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
export const EVENT_PUBLISHER_TOKEN = 'EventPublisher';
export const EVENT_LISTENER_TOKEN = 'EventListener';
