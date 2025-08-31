import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateUserProfileControllerParams {
  @ApiProperty({ 
    example: 'John', 
    description: 'First name',
    required: false 
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ 
    example: 'Doe', 
    description: 'Last name',
    required: false 
  })
  @IsString()
  @IsOptional()
  lastName?: string;
}