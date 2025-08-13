import { DynamicModule, Module, Global, Provider } from '@nestjs/common';
import { Connection, createConnection } from 'mongoose';
import { MongoDBService } from './mongodb.service';
import { MongoDBController } from './mongodb.controller';
import { MongoDBModuleOptions } from './interfaces/mongodb-config.interface';

@Global()
@Module({})
export class SharedMongoDBModule {
  static forRoot(options: MongoDBModuleOptions = {}): DynamicModule {
    const baseUri = options.uri || process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = options.dbName || process.env.MONGODB_DB_NAME || 'nestjs-app';
    
    // Handle URI with query parameters properly
    const uri = baseUri.includes('?') 
      ? `${baseUri.split('?')[0]}/${dbName}?${baseUri.split('?')[1]}`
      : `${baseUri}/${dbName}`;

    const connectionProvider: Provider = {
      provide: 'MONGODB_CONNECTION',
      useFactory: async (): Promise<Connection> => {
        return createConnection(uri, {
          ...options.connectionOptions,
        });
      },
    };

    return {
      module: SharedMongoDBModule,
      controllers: [MongoDBController],
      providers: [
        connectionProvider,
        {
          provide: 'MONGODB_OPTIONS',
          useValue: { ...options, uri, dbName },
        },
        MongoDBService,
      ],
      exports: [MongoDBService, 'MONGODB_CONNECTION'],
    };
  }



  static forFeature(models: any[] = []) {
    // For custom models, they would need to be registered with the connection
    // This is a placeholder for future model registration functionality
    return {
      module: SharedMongoDBModule,
      providers: [],
      exports: [],
    };
  }
}