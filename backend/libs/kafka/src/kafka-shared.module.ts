import { Global, Module } from '@nestjs/common';

import { KafkaService } from './kafka-service';

@Global()
@Module({
  controllers: [],
  providers: [KafkaService],
  exports: [KafkaService],
})
export class SharedKafkaModule {}
