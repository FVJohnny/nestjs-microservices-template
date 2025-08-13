import { Module } from '@nestjs/common';
import { KafkaModule } from './kafka/kafka.module';

// Controllers
import { TestKafkaController } from './interfaces/http/controllers/test-kafka.controller';

// Kafka Handlers (Primary/Driving Adapters)
import { ChannelEventsHandler } from './interfaces/messaging/kafka/handlers/channel-events.handler';
import { NotificationEventsHandler } from './interfaces/messaging/kafka/handlers/notification-events.handler';

// Kafka Consumer Service
import { Service2KafkaConsumerService } from './shared/messaging/kafka/service-2-kafka-consumer.service';

// Shared DDD Library
import { KafkaService } from '@libs/nestjs-kafka';

const KafkaHandlers = [ChannelEventsHandler, NotificationEventsHandler];

@Module({
  imports: [KafkaModule], // Import KafkaModule to provide KafkaService
  controllers: [TestKafkaController],
  providers: [
    ...KafkaHandlers,
    Service2KafkaConsumerService, // Add the Kafka consumer service
    {
      provide: 'KAFKA_SERVICE',
      useExisting: KafkaService,
    },
  ],
  exports: [],
})
export class Service2Module {}