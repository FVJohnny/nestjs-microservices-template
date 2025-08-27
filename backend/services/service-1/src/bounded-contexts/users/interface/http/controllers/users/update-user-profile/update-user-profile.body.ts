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

  @ApiProperty({ 
    example: { bio: 'Software developer', location: 'San Francisco' }, 
    description: 'Additional metadata',
    required: false 
  })
  @IsOptional()
  metadata?: Record<string, any>;
}