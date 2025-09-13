import type { JwtTokenService } from './jwt-token.service';
import type { JwtAccessTokenPayload, JwtRefreshTokenPayload } from './jwt-auth.types';

export interface MockJwtTokenService {
  generateAccessToken: jest.MockedFunction<JwtTokenService['generateAccessToken']>;
  generateRefreshToken: jest.MockedFunction<JwtTokenService['generateRefreshToken']>;
  verifyAccessToken: jest.MockedFunction<JwtTokenService['verifyAccessToken']>;
  verifyRefreshToken: jest.MockedFunction<JwtTokenService['verifyRefreshToken']>;
}

export interface JwtTokenServiceMockOptions {
  shouldFail?: boolean;
  mockGenerateAccessToken?: string;
  mockGenerateRefreshToken?: string;
  mockVerifyAccessToken?: JwtAccessTokenPayload;
  mockVerifyRefreshToken?: JwtRefreshTokenPayload;
}

export const createJwtTokenServiceMock = (
  options: JwtTokenServiceMockOptions = {},
): MockJwtTokenService => {
  const mockService: MockJwtTokenService = {
    generateAccessToken: jest
      .fn()
      .mockReturnValue(options.mockGenerateAccessToken || 'mock-access-token'),
    generateRefreshToken: jest
      .fn()
      .mockReturnValue(options.mockGenerateRefreshToken || 'mock-refresh-token'),
    verifyAccessToken: jest.fn().mockReturnValue(
      options.mockVerifyAccessToken || {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'mock@example.com',
        username: 'mockuser',
        role: 'user',
      },
    ),
    verifyRefreshToken: jest.fn().mockReturnValue(
      options.mockVerifyRefreshToken || {
        userId: '550e8400-e29b-41d4-a716-446655440000',
      },
    ),
  };

  if (options.shouldFail) {
    Object.values(mockService).forEach((mockFn) => {
      mockFn.mockImplementation(() => {
        throw new Error('JWT Token Service mock failure');
      });
    });
  }

  return mockService;
};
