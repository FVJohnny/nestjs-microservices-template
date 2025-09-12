import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAccessTokenPayload, JwtRefreshTokenPayload } from './jwt-auth.types';

@Injectable()
export class JwtTokenService {
  private readonly accessTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenSecret: string;
  private readonly refreshTokenExpiry: string;

  constructor(private readonly jwtService: JwtService) {
    this.accessTokenSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  generateAccessToken(payload: JwtAccessTokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.accessTokenSecret,
      expiresIn: this.accessTokenExpiry,
    });
  }

  generateRefreshToken(payload: JwtRefreshTokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.refreshTokenSecret,
      expiresIn: this.refreshTokenExpiry,
    });
  }

  verifyAccessToken(token: string): JwtAccessTokenPayload {
    return this.jwtService.verify<JwtAccessTokenPayload>(token, {
      secret: this.accessTokenSecret,
    });
  }

  verifyRefreshToken(token: string): JwtRefreshTokenPayload {
    return this.jwtService.verify<JwtRefreshTokenPayload>(token, {
      secret: this.refreshTokenSecret,
    });
  }
}
