import { Module, Global, Provider } from '@nestjs/common';
import { MongoDBController } from './mongodb.controller';
import { MongoDBConfigService } from './mongodb-config.service';
import { MongooseModuleAsyncOptions } from '@nestjs/mongoose';
import { MongoClient } from 'mongodb';

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

  static MONGO_CLIENT_TOKEN = 'MONGODB_CLIENT';
  /**
   * Returns Mongoose configuration for use in application-level modules
   */
  static getMongooseConfig(): MongooseModuleAsyncOptions {
    return {
      useFactory: (configService: MongoDBConfigService) => 
        configService.getMongoConfig(),
      inject: [MongoDBConfigService],
    };
  }

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