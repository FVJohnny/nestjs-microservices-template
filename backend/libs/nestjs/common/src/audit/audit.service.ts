import { Injectable } from '@nestjs/common';
import { AuditLog, AuditConfig } from './audit-log.interface';
import { CorrelationLogger } from '../correlation/correlation.logger';

@Injectable()
export class AuditService {
  private readonly logger = new CorrelationLogger(AuditService.name);
  private readonly config: AuditConfig;

  constructor() {
    this.config = {
      enabled: process.env.AUDIT_ENABLED !== 'false',
      logRequests: process.env.AUDIT_LOG_REQUESTS !== 'false',
      logResponses: process.env.AUDIT_LOG_RESPONSES !== 'false',
      logHeaders: process.env.AUDIT_LOG_HEADERS === 'true',
      logBody: process.env.AUDIT_LOG_BODY !== 'false',
      maxBodySize: parseInt(process.env.AUDIT_MAX_BODY_SIZE || '1024', 10),
      sensitiveFields: (process.env.AUDIT_SENSITIVE_FIELDS || 'password,token,secret,key,authorization').split(','),
      excludePaths: (process.env.AUDIT_EXCLUDE_PATHS || '/health,/metrics,/docs').split(','),
      storage: (process.env.AUDIT_STORAGE as 'console' | 'database' | 'file') || 'console',
    };
  }

  shouldLog(path: string): boolean {
    if (!this.config.enabled) return false;
    return !this.config.excludePaths.some(excludePath => path.startsWith(excludePath));
  }

  sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    for (const key in sanitized) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  truncateBody(body: any): any {
    if (!body) return body;
    
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    if (bodyString.length > this.config.maxBodySize) {
      return bodyString.substring(0, this.config.maxBodySize) + '... [TRUNCATED]';
    }
    
    return body;
  }

  async logRequest(auditLog: AuditLog): Promise<void> {
    if (!this.config.enabled || !this.config.logRequests) return;

    const sanitizedLog = { ...auditLog };

    // Sanitize sensitive data
    if (sanitizedLog.requestHeaders && this.config.logHeaders) {
      sanitizedLog.requestHeaders = this.sanitizeData(sanitizedLog.requestHeaders);
    }
    
    if (sanitizedLog.requestBody && this.config.logBody) {
      sanitizedLog.requestBody = this.truncateBody(this.sanitizeData(sanitizedLog.requestBody));
    }

    // Store request log
    switch (this.config.storage) {
      case 'console':
        this.logRequestToConsole(sanitizedLog);
        break;
      case 'database':
        await this.logToDatabase(sanitizedLog);
        break;
      case 'file':
        await this.logToFile(sanitizedLog);
        break;
    }
  }

  async logResponse(auditLog: AuditLog): Promise<void> {
    if (!this.config.enabled || !this.config.logResponses) return;

    const sanitizedLog = { ...auditLog };

    // Sanitize sensitive data
    if (sanitizedLog.responseBody && this.config.logBody) {
      sanitizedLog.responseBody = this.truncateBody(this.sanitizeData(sanitizedLog.responseBody));
    }

    if (sanitizedLog.responseHeaders && this.config.logHeaders) {
      sanitizedLog.responseHeaders = this.sanitizeData(sanitizedLog.responseHeaders);
    }

    // Store response log
    switch (this.config.storage) {
      case 'console':
        this.logResponseToConsole(sanitizedLog);
        break;
      case 'database':
        await this.logToDatabase(sanitizedLog);
        break;
      case 'file':
        await this.logToFile(sanitizedLog);
        break;
    }
  }

  async logAudit(auditLog: AuditLog): Promise<void> {
    if (!this.config.enabled) return;

    // Sanitize sensitive data
    if (auditLog.requestHeaders && this.config.logHeaders) {
      auditLog.requestHeaders = this.sanitizeData(auditLog.requestHeaders);
    }
    
    if (auditLog.requestBody && this.config.logBody) {
      auditLog.requestBody = this.truncateBody(this.sanitizeData(auditLog.requestBody));
    }
    
    if (auditLog.responseBody && this.config.logBody) {
      auditLog.responseBody = this.truncateBody(this.sanitizeData(auditLog.responseBody));
    }

    if (auditLog.responseHeaders && this.config.logHeaders) {
      auditLog.responseHeaders = this.sanitizeData(auditLog.responseHeaders);
    }

    // Store audit log based on configuration
    switch (this.config.storage) {
      case 'console':
        this.logToConsole(auditLog);
        break;
      case 'database':
        await this.logToDatabase(auditLog);
        break;
      case 'file':
        await this.logToFile(auditLog);
        break;
    }
  }

  private isSensitiveField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase();
    return this.config.sensitiveFields.some(sensitive => 
      lowerField.includes(sensitive.toLowerCase())
    );
  }

  private logRequestToConsole(auditLog: AuditLog): void {
    this.logger.log(`➡️  REQUEST: ${auditLog.method} ${auditLog.url} [${auditLog.correlationId}]`);
  }

  private logResponseToConsole(auditLog: AuditLog): void {
    const statusEmoji = auditLog.responseStatus! >= 400 ? '❌' : '✅';
    this.logger.log(`${statusEmoji} RESPONSE: ${auditLog.method} ${auditLog.url} - ${auditLog.responseStatus} (${auditLog.duration}ms) [${auditLog.correlationId}]`);
  }

  private logToConsole(auditLog: AuditLog): void {
    this.logger.log(`AUDIT: ${auditLog.method} ${auditLog.url} - ${auditLog.responseStatus} (${auditLog.duration}ms)`);
  }

  private async logToDatabase(auditLog: AuditLog): Promise<void> {
    // TODO: Implement database storage when database is available
    this.logger.warn('Database audit storage not implemented yet, falling back to console');
    this.logToConsole(auditLog);
  }

  private async logToFile(auditLog: AuditLog): Promise<void> {
    // TODO: Implement file storage
    this.logger.warn('File audit storage not implemented yet, falling back to console');
    this.logToConsole(auditLog);
  }
}