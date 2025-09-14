import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { UserRoleEnum } from '@bc/auth/domain/value-objects';

export class RegisterUserControllerParams {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'johndoe', description: 'Username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'password', description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    example: 'user',
    description: 'User role',
    enum: UserRoleEnum,
  })
  @IsNotEmpty()
  @IsString()
  role: UserRoleEnum;
}
