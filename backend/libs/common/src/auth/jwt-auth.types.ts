import type { Request } from 'express';

export class TokenPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
}

class JwtPayload {
  uniqueId: string;
  iat: number;
  exp: number;
}

export type JwtTokenPayload = JwtPayload & TokenPayload;

export interface AuthenticatedRequest extends Request {
  tokenData: JwtTokenPayload;
}
