import { Injectable } from '@nestjs/common';
import { MongooseModuleOptions } from '@nestjs/mongoose';

@Injectable()
export class MongoDBConfigService {
  createMongooseOptions(): MongooseModuleOptions {
    const dbName = process.env.MONGODB_DB_NAME || 'nestjs-app';
    
    return {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nestjs-app',
      dbName,
    };
  }

  getConnectionString(): string {
    const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'nestjs-app';
    
    return baseUri.includes('?') 
      ? `${baseUri.split('?')[0]}/${dbName}?${baseUri.split('?')[1]}`
      : `${baseUri}/${dbName}`;
  }

  getDatabaseName(): string {
    return process.env.MONGODB_DB_NAME || 'nestjs-app';
  }
}