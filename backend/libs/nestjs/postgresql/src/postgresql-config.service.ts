import { Injectable, Logger } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { PostgreSQLConfig } from './interfaces/postgresql-config.interface';

@Injectable()
export class PostgreSQLConfigService {
  private readonly logger = new Logger(PostgreSQLConfigService.name);

  getPostgreSQLConfig(): PostgreSQLConfig {
    let config: PostgreSQLConfig = {
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || 'channels_db',
      synchronize: process.env.POSTGRES_SYNCHRONIZE === 'true',
      logging: process.env.POSTGRES_LOGGING === 'true',
      entities: [], // Will be configured per service
      migrations: [],
      subscribers: [],
    };

    // SSL configuration for production
    if (process.env.POSTGRES_SSL === 'true') {
      config.ssl = {
        rejectUnauthorized: process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== 'false',
        ca: process.env.POSTGRES_SSL_CA,
        cert: process.env.POSTGRES_SSL_CERT,
        key: process.env.POSTGRES_SSL_KEY,
      };
    }

    // Connection pool settings
    if (process.env.POSTGRES_CONNECTION_LIMIT) {
      config = {
        ...config,
        extra: {
          ...config.extra,
          connectionLimit: parseInt(process.env.POSTGRES_CONNECTION_LIMIT, 10),
        },
      };
    }

    this.logger.log(
      `PostgreSQL configuration: ${config.host}:${config.port}/${config.database} (user: ${config.username}, SSL: ${!!config.ssl})`,
    );
    
    // Debug environment variables
    this.logger.debug('Environment variables:', {
      POSTGRES_HOST: process.env.POSTGRES_HOST,
      POSTGRES_PORT: process.env.POSTGRES_PORT,
      POSTGRES_USER: process.env.POSTGRES_USER,
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ? '***' : undefined,
      POSTGRES_DB: process.env.POSTGRES_DB,
    });

    return config;
  }

  /**
   * Get connection URL for PostgreSQL
   * Useful for CLI tools and migrations
   */
  getConnectionUrl(): string {
    const config = this.getPostgreSQLConfig();
    const auth = `${config.username}:${config.password}`;
    const host = `${config.host}:${config.port}`;
    const sslParam = config.ssl ? '?sslmode=require' : '';
    
    return `postgresql://${auth}@${host}/${config.database}${sslParam}`;
  }

  /**
   * Validate that required environment variables are set
   */
  validateConfig(): void {
    const requiredVars = ['POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB'];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      this.logger.warn(
        `Missing PostgreSQL environment variables: ${missing.join(', ')}. Using defaults.`,
      );
    }
  }
}