import { Global, Module } from '@nestjs/common';
import { INTEGRATION_EVENT_PUBLISHER } from './publisher/event-publisher.interface';
import { InMemoryIntegrationEventPublisher } from './publisher/in-memory.integration-event-publisher';
import { InMemoryIntegrationEventListener } from './listener/in-memory.integration-event-listener';
import { INTEGRATION_EVENT_LISTENER } from './listener/base.integration-event-listener';
import { IntegrationEventsController } from './controller/integration-events.controller';

@Global()
@Module({
  providers: [
    IntegrationEventsController,
    {
      provide: INTEGRATION_EVENT_PUBLISHER,
      useFactory: () => new InMemoryIntegrationEventPublisher(false),
    },
    {
      provide: INTEGRATION_EVENT_LISTENER,
      useClass: InMemoryIntegrationEventListener,
    },
  ],
  exports: [INTEGRATION_EVENT_PUBLISHER, INTEGRATION_EVENT_LISTENER],
})
export class InMemoryIntegrationEventsModule {}
