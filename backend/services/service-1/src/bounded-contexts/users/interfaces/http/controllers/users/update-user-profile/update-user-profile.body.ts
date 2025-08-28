import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateUserProfileBodyDto {
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