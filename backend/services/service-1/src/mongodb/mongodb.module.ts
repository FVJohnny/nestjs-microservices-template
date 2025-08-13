import { Module } from '@nestjs/common';
import { SharedMongoDBModule } from '@libs/nestjs-common';

@Module({
  imports: [
    SharedMongoDBModule.forRoot({
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      dbName: process.env.MONGODB_DB_NAME || 'service-1-db',
      connectionOptions: {
        retryWrites: true, 
        w: 'majority',
      },
    }),
  ],
  exports: [SharedMongoDBModule],
})
export class MongoDBModule {}