import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  userId!: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'User username',
    example: 'johndoe',
  })
  username!: string;

  @ApiProperty({
    description: 'User role',
    example: 'user',
  })
  role!: string;

  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;
}
