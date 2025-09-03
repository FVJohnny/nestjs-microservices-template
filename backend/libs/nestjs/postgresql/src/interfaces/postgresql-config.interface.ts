import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

export type PostgreSQLConfig = TypeOrmModuleOptions & {
  type: 'postgres';
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