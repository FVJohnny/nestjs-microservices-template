import { Module } from '@nestjs/common';
import { KafkaModule } from './kafka/kafka.module';
import { SharedModule } from './shared/shared.module';
import { Service2Module } from './service-2.module';
import { HeartbeatModule } from '@libs/nestjs-common';

@Module({
  imports: [
    KafkaModule,
    SharedModule,
    HeartbeatModule,
    Service2Module,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
