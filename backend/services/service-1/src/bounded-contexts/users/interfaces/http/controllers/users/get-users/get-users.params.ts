import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ControllerPaginationParams } from '@libs/nestjs-common';

export class GetUsersControllerParams extends ControllerPaginationParams {
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

  @ApiProperty({
    required: false,
    description: 'Filter by first name (partial match)',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    required: false,
    description: 'Filter by last name (partial match)',
  })
  @IsOptional()
  @IsString()
  lastName?: string;
}
