import { Module, forwardRef } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KafkaModule } from './kafka/kafka.module';

@Module({
  imports: [forwardRef(() => KafkaModule)],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
