import { Module, forwardRef } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KafkaModule } from './kafka/kafka.module';
import { EventCounterService } from './event-counter.service';

@Module({
  imports: [forwardRef(() => KafkaModule)],
  controllers: [AppController],
  providers: [AppService, EventCounterService],
  exports: [EventCounterService],
})
export class AppModule {}
