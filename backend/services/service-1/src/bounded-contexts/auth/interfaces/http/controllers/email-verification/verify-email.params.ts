import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyEmailRequestDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class VerifyEmailResponseDto {
  success: boolean;
  userId: string;
}
