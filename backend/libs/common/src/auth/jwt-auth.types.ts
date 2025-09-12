import type { Request } from 'express';

export interface JwtAccessTokenPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshTokenPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtAccessTokenPayload;
}
