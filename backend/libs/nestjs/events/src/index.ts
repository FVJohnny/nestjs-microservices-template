export * from './events.module';

// Re-export common tokens and interfaces from the common library
export { INTEGRATION_EVENT_PUBLISHER_TOKEN, INTEGRATION_EVENT_LISTENER_TOKEN } from '@libs/nestjs-common';
export type { IntegrationEventPublisher as EventPublisher } from '@libs/nestjs-common';