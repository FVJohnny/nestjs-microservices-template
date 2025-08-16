export interface AuditLog {
  id?: string;
  correlationId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  requestHeaders?: Record<string, any>;
  requestBody?: any;
  responseStatus?: number;
  responseHeaders?: Record<string, any>;
  responseBody?: any;
  duration?: number;
  timestamp: Date;
  error?: string;
}

export interface AuditConfig {
  enabled: boolean;
  logRequests: boolean;
  logResponses: boolean;
  logHeaders: boolean;
  logBody: boolean;
  maxBodySize: number;
  sensitiveFields: string[];
  excludePaths: string[];
  storage: 'console' | 'database' | 'file';
}