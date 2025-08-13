import { DynamicModule, Module, Global } from '@nestjs/common';
import { MongoDBService } from './mongodb.service';
import { MongoDBController } from './mongodb.controller';
import { MongoDBModuleOptions } from './interfaces/mongodb-config.interface';

@Global()
@Module({})
export class SharedMongoDBModule {
  /**
   * Provides MongoDB configuration utilities and services
   * Services should use MongooseModule.forRoot() directly to avoid DI conflicts
   */
  static forRoot(options: MongoDBModuleOptions = {}): DynamicModule {
    const baseUri = options.uri || process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = options.dbName || process.env.MONGODB_DB_NAME || 'nestjs-app';
    
    // Handle URI with query parameters properly
    const uri = baseUri.includes('?') 
      ? `${baseUri.split('?')[0]}/${dbName}?${baseUri.split('?')[1]}`
      : `${baseUri}/${dbName}`;

    return {
      module: SharedMongoDBModule,
      controllers: [MongoDBController],
      providers: [
        {
          provide: 'MONGODB_CONFIG',
          useValue: { 
            uri, 
            dbName,
            connectionOptions: {
              retryWrites: true,
              w: 'majority',
              ...options.connectionOptions,
            }
          },
        },
        MongoDBService,
      ],
      exports: ['MONGODB_CONFIG', MongoDBService],
    };
  }

  /**
   * Helper method to get MongoDB connection configuration
   * Services should use this with MongooseModule.forRoot() directly
   */
  static getConnectionConfig(options: MongoDBModuleOptions = {}) {
    const baseUri = options.uri || process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = options.dbName || process.env.MONGODB_DB_NAME || 'nestjs-app';
    
    const uri = baseUri.includes('?') 
      ? `${baseUri.split('?')[0]}/${dbName}?${baseUri.split('?')[1]}`
      : `${baseUri}/${dbName}`;

    return {
      uri,
      options: {
        retryWrites: true,
        w: 'majority',
        ...options.connectionOptions,
      }
    };
  }
}