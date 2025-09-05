import { Global,Module } from '@nestjs/common';

import { EventTrackerService } from './event-tracker.service';
import { IntegrationEventsController } from './integration-events.controller';

@Global()
@Module({
  providers: [
    EventTrackerService,
  ],
  controllers: [IntegrationEventsController],
  exports: [
    EventTrackerService,
  ],
})
export class SharedIntegrationEventsModule {}