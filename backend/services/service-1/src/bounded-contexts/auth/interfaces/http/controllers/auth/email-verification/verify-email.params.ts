import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailRequestDto {
  @ApiProperty({
    description: 'The email verification token sent to the user',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class VerifyEmailResponseDto {
  @ApiProperty({
    description: 'Indicates whether the email verification was successful',
    example: true,
    type: Boolean,
  })
  success: boolean;

  @ApiProperty({
    description: 'The ID of the user whose email was verified',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  userId: string;
}
