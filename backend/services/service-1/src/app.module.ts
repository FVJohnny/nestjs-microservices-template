import { Module } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ChannelsModule } from './ddd/channels/channels.module';
import { HeartbeatModule, CorrelationModule, SharedMongoDBModule } from '@libs/nestjs-common';
import { KafkaSharedModule } from '@libs/nestjs-kafka';
import { MessagingModule } from './messaging.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/nestjs-app'),
    KafkaSharedModule.forRoot({
      clientId: 'service-1',
      groupId: 'service-1',
      retryDelayMs: 5000,
    }),
    SharedMongoDBModule,
    HeartbeatModule,
    CorrelationModule,
    MessagingModule,
    // Bounded Contexts
    ChannelsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
