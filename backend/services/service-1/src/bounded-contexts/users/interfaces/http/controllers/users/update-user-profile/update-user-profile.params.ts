import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateUserProfileControllerParams {
  @ApiProperty({ 
    example: 'John', 
    description: 'First name',
    required: true 
  })
  @IsString()
  firstName: string;

  @ApiProperty({ 
    example: 'Doe', 
    description: 'Last name',
    required: true 
  })
  @IsString()
  lastName: string;
}