// Common types used across all services

export interface BaseEvent {
  id: string;
  timestamp: string;
  source: string;
  type: string;
}

export interface UserCreatedEvent extends BaseEvent {
  type: 'USER_CREATED';
  userId: string;
  email: string;
}

export interface ServiceHealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  details?: Record<string, any>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Environment types
export type Environment = 'development' | 'staging' | 'production';

// Service identifiers
export type ServiceName = 'service-1' | 'service-3' | 'frontend';
