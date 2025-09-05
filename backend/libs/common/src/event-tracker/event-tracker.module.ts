import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EventTrackerService } from './event-tracker.service';
import { DomainEventTrackerInterceptor } from './domain-event-tracker.interceptor';
import { IntegrationEventTrackerInterceptor } from './integration-event-tracker.interceptor';
import { EventTrackerController } from './event-tracker.controller';
import { FileSystemDomainEventDiscoveryService } from './file-system-domain-event-discovery.service';

@Module({
  imports: [CqrsModule],
  controllers: [EventTrackerController],
  providers: [
    EventTrackerService,
    DomainEventTrackerInterceptor,
    IntegrationEventTrackerInterceptor,
    FileSystemDomainEventDiscoveryService,
  ],
})
export class EventTrackerModule implements OnApplicationBootstrap {
  constructor(
    private readonly domainEventTracker: DomainEventTrackerInterceptor,
    private readonly domainDiscoveryService: FileSystemDomainEventDiscoveryService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const discoveredEvents = await this.domainDiscoveryService.discoverDomainEvents();
    this.domainEventTracker.initializeDomainEventStats(discoveredEvents);
  }
}