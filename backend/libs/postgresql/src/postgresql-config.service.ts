import { Injectable, Logger } from "@nestjs/common";

import { TypeOrmModuleOptions } from "@nestjs/typeorm";

@Injectable()
export class PostgreSQLConfigService {
  private readonly logger = new Logger(PostgreSQLConfigService.name);

  getPostgreSQLConfig(): PostgreSQLConfig {
    const config: PostgreSQLConfig = {
      type: "postgres",
      host: process.env.POSTGRES_HOST || "localhost",
      port: parseInt(process.env.POSTGRES_PORT || "5432"),
      username: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD || "postgres",
      database: process.env.POSTGRES_DB || "channels_db",
      synchronize: process.env.POSTGRES_SYNCHRONIZE === "true",
      logging: process.env.POSTGRES_LOGGING === "true",
      extra: {
        conectionLimit: parseInt(process.env.POSTGRES_CONNECTION_LIMIT || "10"),
      },
    };

    // SSL configuration for production
    if (process.env.POSTGRES_SSL === "true") {
      config.ssl = {
        rejectUnauthorized:
          process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== "false",
        ca: process.env.POSTGRES_SSL_CA,
        cert: process.env.POSTGRES_SSL_CERT,
        key: process.env.POSTGRES_SSL_KEY,
      };
    }

    this.logger.log(
      `PostgreSQL configuration: ${config.host}:${config.port}/${config.database} (user: ${config.username}, SSL: ${!!config.ssl})`,
    );

    return config;
  }

  getConnectionUrl(): string {
    const config = this.getPostgreSQLConfig();
    const auth = `${config.username}:${config.password}`;
    const host = `${config.host}:${config.port}`;
    const sslParam = config.ssl ? "?sslmode=require" : "";

    return `postgresql://${auth}@${host}/${config.database}${sslParam}`;
  }

  validateConfig(): void {
    const requiredVars = [
      "POSTGRES_HOST",
      "POSTGRES_USER",
      "POSTGRES_PASSWORD",
      "POSTGRES_DB",
    ];
    const missing = requiredVars.filter((varName) => !process.env[varName]);

    if (missing.length > 0) {
      this.logger.warn(
        `Missing PostgreSQL environment variables: ${missing.join(", ")}. Using defaults.`,
      );
    }
  }
}

export type PostgreSQLConfig = TypeOrmModuleOptions & {
  type: "postgres";
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize?: boolean;
  logging?: boolean;
  ssl?: {
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
};
