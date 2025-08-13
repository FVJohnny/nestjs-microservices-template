import { Injectable, Inject, Logger } from '@nestjs/common';
import { MongoDBModuleOptions } from './interfaces/mongodb-config.interface';

@Injectable()
export class MongoDBService {
  private readonly logger = new Logger(MongoDBService.name);

  constructor(
    @Inject('MONGODB_CONFIG') private readonly config: any,
  ) {
    this.logger.log(`MongoDB configuration loaded for database: ${config.dbName}`);
  }



  /**
   * Get the MongoDB connection configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get the connection URI
   */
  getConnectionUri(): string {
    return this.config.uri;
  }

  /**
   * Get the database name
   */
  getDatabaseName(): string {
    return this.config.dbName;
  }

  /**
   * Get the connection options
   */
  getConnectionOptions() {
    return this.config.connectionOptions;
  }
}