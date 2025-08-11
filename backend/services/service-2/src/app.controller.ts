import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { KafkaService } from '@libs/nestjs-kafka';
import { UserCreatedEvent, ApiResponse } from '@libs/nestjs-types';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly kafkaService: KafkaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('/publish-event')
  async publishEvent() {
    await this.kafkaService.publishMessage('example-topic', {
      type: 'USER_CREATED',
      userId: '123',
      email: 'test@example.com',
      timestamp: new Date().toISOString(),
      source: 'service-2',
    });

    return { message: 'Event published to Kafka' };
  }

}
