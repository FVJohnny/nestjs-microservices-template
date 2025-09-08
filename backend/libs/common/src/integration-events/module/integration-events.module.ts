import { Global, Module } from '@nestjs/common';

import { IntegrationEventsController } from './integration-events.controller';

@Global()
@Module({
  providers: [],
  controllers: [IntegrationEventsController],
})
export class SharedIntegrationEventsModule {}
