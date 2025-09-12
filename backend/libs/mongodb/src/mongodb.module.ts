import { Global, Module, Provider } from '@nestjs/common';
import { MongoClient } from 'mongodb';

import { MongoDBController } from './mongodb.controller';
import { MongoDBConfigService } from './mongodb-config.service';

export const MONGO_CLIENT_TOKEN = 'MONGODB_CLIENT';

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
      useFactory: async (configService: MongoDBConfigService): Promise<MongoClient> => {
        const client = new MongoClient(configService.getConnectionString());
        await client.connect();
        return client;
      },
      inject: [MongoDBConfigService],
    };
  }
}
