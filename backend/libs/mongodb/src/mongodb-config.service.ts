import { Injectable } from '@nestjs/common';
import { MongooseModuleOptions } from '@nestjs/mongoose';

@Injectable()
export class MongoDBConfigService {
  getConnectionString(): string {
    return process.env.MONGODB_URI || 'mongodb://localhost:27017';
  }

  getDatabaseName(): string {
    const uri = this.getConnectionString();

    // Find the database part between the last "/" and "?" (if present)
    const pathMatch = uri.match(/\/([^/?]+)(\?|$)/);
    if (pathMatch && pathMatch[1]) {
      // Check if this is actually a database name (not host:port)
      const dbCandidate = pathMatch[1];
      // If it contains @ or :, it's likely part of the connection string, not a database
      if (dbCandidate.includes('@') || dbCandidate.includes(':')) {
        return '';
      }
      return dbCandidate;
    }

    return '';
  }

  getMongoConfig(): MongooseModuleOptions {
    return {
      uri: this.getConnectionString(),
      dbName: this.getDatabaseName(),
    };
  }
}
