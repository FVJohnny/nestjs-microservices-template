import { IsEmail, IsString, IsOptional, IsArray, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRoleEnum } from '../../../domain/value-objects/user-role.vo';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'johndoe' })
  @IsString()
  username: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ 
    example: [UserRoleEnum.USER],
    enum: UserRoleEnum,
    isArray: true 
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRoleEnum, { each: true })
  roles?: UserRoleEnum[];

  @ApiPropertyOptional({ 
    example: { department: 'Engineering', location: 'Remote' } 
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}