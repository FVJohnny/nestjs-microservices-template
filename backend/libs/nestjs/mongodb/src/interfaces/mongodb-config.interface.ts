import type { MongooseModuleOptions } from '@nestjs/mongoose';

export interface MongoDBModuleOptions {
  uri?: string;
  dbName?: string;
  connectionOptions?: MongooseModuleOptions;
}

export interface MongoDBConnection {
  name?: string;
  uri: string;
  dbName?: string;
  options?: MongooseModuleOptions;
}

export interface MongoDBMultiConnectionOptions {
  connections: MongoDBConnection[];
  defaultConnection?: string;
}