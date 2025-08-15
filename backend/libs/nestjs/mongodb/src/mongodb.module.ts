import { Module, Global } from '@nestjs/common';
import { MongoDBController } from './mongodb.controller';
import { MongoDBConfigService } from './mongodb-config.service';
import { MongooseModuleAsyncOptions } from '@nestjs/mongoose';

@Global()
@Module({
  controllers: [MongoDBController],
  providers: [
    MongoDBConfigService,
  ],
  exports: [MongoDBConfigService],
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