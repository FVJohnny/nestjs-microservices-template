export * from './events.module';

// Re-export common tokens and interfaces from the common library
export { EVENT_PUBLISHER_TOKEN, EVENT_LISTENER_TOKEN } from '@libs/nestjs-common';
export type { EventPublisher } from '@libs/nestjs-common';