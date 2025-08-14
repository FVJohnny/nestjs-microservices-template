export interface RedisConfig {
  host: string;
  port: number;
  tls: boolean;
  username?: string;
  password?: string;
  db?: number;
  keyPrefix?: string;
  connectTimeout?: number;
  lazyConnect?: boolean;
  maxRetriesPerRequest?: number;
}