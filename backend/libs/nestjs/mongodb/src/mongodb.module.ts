import { Module, Global } from '@nestjs/common';
import { MongoDBController } from './mongodb.controller';
import { MongoDBConfigService } from './mongodb-config.service';
import { MongooseModule } from '@nestjs/mongoose';

@Global()
@Module({
  controllers: [MongoDBController],
  providers: [
    MongoDBConfigService,
  ],
  exports: [MongoDBConfigService],
})
export class SharedMongoDBModule {}