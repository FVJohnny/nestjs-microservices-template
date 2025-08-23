import { Module, Global } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { MongoDBController } from './mongodb.controller';
import { MongoDBConfigService } from './mongodb-config.service';
import { MongooseModuleAsyncOptions } from '@nestjs/mongoose';

@Global()
@Module({
  controllers: [MongoDBController],
  providers: [
    MongoDBConfigService,
    {
      provide: 'MONGODB_CLIENT',
      useFactory: async (configService: MongoDBConfigService): Promise<MongoClient> => {
        const client = new MongoClient(configService.getConnectionString());
        await client.connect();
        return client;
      },
      inject: [MongoDBConfigService],
    },
  ],
  exports: [MongoDBConfigService, 'MONGODB_CLIENT'],
})
export class SharedMongoDBModule {
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
}