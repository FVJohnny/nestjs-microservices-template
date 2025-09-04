import { Global,Module } from '@nestjs/common';

import { EventTrackerService } from './event-tracker.service';
import { MessagingController } from './integration-events.controller';

@Global()
@Module({
  providers: [
    EventTrackerService,
  ],
  controllers: [MessagingController],
  exports: [
    EventTrackerService,
  ],
})
export class IntegrationEventsModule {}