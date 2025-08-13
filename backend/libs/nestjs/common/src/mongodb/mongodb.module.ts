import { Module, Global } from '@nestjs/common';
import { MongoDBService } from './mongodb.service';
import { MongoDBController } from './mongodb.controller';

@Global()
@Module({
  controllers: [MongoDBController],
  providers: [
    {
      provide: 'MONGODB_CONFIG',
      useFactory: () => {
        const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
        const dbName = process.env.MONGODB_DB_NAME || 'nestjs-app';
        
        const uri = baseUri.includes('?') 
          ? `${baseUri.split('?')[0]}/${dbName}?${baseUri.split('?')[1]}`
          : `${baseUri}/${dbName}`;

        return { uri, dbName };
      },
    },
    MongoDBService,
  ],
  exports: ['MONGODB_CONFIG', MongoDBService],
})
export class SharedMongoDBModule {}