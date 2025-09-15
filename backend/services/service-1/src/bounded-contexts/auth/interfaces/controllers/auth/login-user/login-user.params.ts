import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginUserControllerParams {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
