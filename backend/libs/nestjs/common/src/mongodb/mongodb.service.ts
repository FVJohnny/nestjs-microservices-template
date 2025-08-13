import { Injectable, OnModuleInit, OnModuleDestroy, Inject, Logger, Optional } from '@nestjs/common';
import { Connection } from 'mongoose';
import { MongoDBModuleOptions } from './interfaces/mongodb-config.interface';

@Injectable()
export class MongoDBService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongoDBService.name);
  private isConnected = false;

  constructor(
    @Inject('MONGODB_CONNECTION') private readonly connection: Connection,
    @Optional() @Inject('MONGODB_OPTIONS') private readonly options: MongoDBModuleOptions = {},
  ) {}

  async onModuleInit() {
    this.connection.on('connected', () => {
      this.isConnected = true;
      this.logger.log(`MongoDB connected to ${this.getConnectionString()}`);
    });

    this.connection.on('disconnected', () => {
      this.isConnected = false;
      this.logger.warn('MongoDB disconnected');
    });

    this.connection.on('error', (error) => {
      this.logger.error('MongoDB connection error:', error);
    });

    if (this.connection.readyState === 1) {
      this.isConnected = true;
      this.logger.log(`MongoDB already connected to ${this.getConnectionString()}`);
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.connection.close();
      this.logger.log('MongoDB connection closed');
    }
  }

  getConnection(): Connection {
    return this.connection;
  }

  isHealthy(): boolean {
    return this.isConnected && this.connection.readyState === 1;
  }

  getConnectionStatus() {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    return {
      isConnected: this.isConnected,
      readyState: this.connection.readyState,
      readyStateText: states[this.connection.readyState] || 'unknown',
      database: this.connection.name,
      host: this.connection.host,
      port: this.connection.port,
    };
  }

  private getConnectionString(): string {
    const dbName = this.options.dbName || this.connection.name || 'default';
    const uri = this.options.uri || 'mongodb://localhost:27017';
    return `${uri}/${dbName}`;
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.connection.db) {
        return false;
      }
      await this.connection.db.admin().ping();
      return true;
    } catch (error) {
      this.logger.error('MongoDB ping failed:', error);
      return false;
    }
  }

  async getDbStats() {
    if (!this.connection.db) {
      throw new Error('Database connection not established');
    }
    return this.connection.db.stats();
  }

  async listCollections() {
    if (!this.connection.db) {
      throw new Error('Database connection not established');
    }
    const collections = await this.connection.db.listCollections().toArray();
    return collections.map(col => col.name);
  }
}