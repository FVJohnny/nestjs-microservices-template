import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, IsArray, IsOptional, MinLength } from 'class-validator';
import { UserRoleEnum } from '../../../../../domain/value-objects/user-role.vo';

export class RegisterUserControllerParams {
  @ApiProperty({ example: 'john.doe@example.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'johndoe', description: 'Username' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'John', description: 'First name', required: false })
  @IsString()
  @IsOptional()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name', required: false })
  @IsString()
  @IsOptional()
  lastName: string;

  @ApiProperty({ 
    example: ['user'], 
    description: 'User roles',
    enum: UserRoleEnum,
    isArray: true,
  })
  @IsArray()
  @IsNotEmpty()
  role: UserRoleEnum;
}