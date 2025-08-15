import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export type PostgreSQLConfig = TypeOrmModuleOptions & {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize?: boolean;
  logging?: boolean;
  entities?: any[];
  migrations?: any[];
  subscribers?: any[];
  ssl?: {
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
};