import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ControllerPaginationParams } from '@libs/nestjs-common';

export class GetUsers_ControllerParams extends ControllerPaginationParams {
  @ApiProperty({ required: false, description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ required: false, description: 'Filter by user status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false, description: 'Filter by role' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({
    required: false,
    description: 'Filter by email (partial match)',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    required: false,
    description: 'Filter by username (partial match)',
  })
  @IsOptional()
  @IsString()
  username?: string;
}
