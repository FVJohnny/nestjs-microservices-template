import { Global, Module, Provider } from '@nestjs/common';
import { MongoClient } from 'mongodb';

import { MongoDBController } from './mongodb.controller';
import { MongoDBConfigService } from './mongodb-config.service';
import { MONGO_CLIENT_TOKEN } from './mongodb.tokens';

@Global()
@Module({
  controllers: [MongoDBController],
  providers: [MongoDBConfigService, MongoDBModule.mongoProvider()],
  exports: [MongoDBConfigService, MONGO_CLIENT_TOKEN],
})
export class MongoDBModule {
  static mongoProvider(): Provider {
    return {
      provide: MONGO_CLIENT_TOKEN,
      useFactory: async (configService: MongoDBConfigService): Promise<MongoClient | null> => {
        const uri = configService.getConnectionString();
        const client = new MongoClient(uri, {
          retryWrites: true,
          maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 20,
          serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 5000,
          socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS) || 5000,
          connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS) || 5000,
        });
        await client.connect();
        return client;
      },
      inject: [MongoDBConfigService],
    };
  }
}
