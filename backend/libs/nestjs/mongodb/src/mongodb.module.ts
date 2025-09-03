import { Global, Module, Provider } from '@nestjs/common';
import { MongoClient } from 'mongodb';

import { MongoDBController } from './mongodb.controller';
import { MongoDBConfigService } from './mongodb-config.service';

@Global()
@Module({
  controllers: [MongoDBController],
  providers: [
    MongoDBConfigService,
    SharedMongoDBModule.mongoProvider(),
  ],
  exports: [MongoDBConfigService, SharedMongoDBModule.MONGO_CLIENT_TOKEN],
})
export class SharedMongoDBModule {

  static MONGO_CLIENT_TOKEN = Symbol('MONGODB_CLIENT');

  static mongoProvider(): Provider {
    return {
      provide: SharedMongoDBModule.MONGO_CLIENT_TOKEN,
      useFactory: async (configService: MongoDBConfigService): Promise<MongoClient> => {
        const client = new MongoClient(configService.getConnectionString());
        await client.connect();
        return client;
      },
      inject: [MongoDBConfigService],
    };
  }
}