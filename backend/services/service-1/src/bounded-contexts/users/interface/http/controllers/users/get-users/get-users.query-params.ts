import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OrderTypes } from '@libs/nestjs-common';

export class GetUsersQueryParams {
  @ApiProperty({ required: false, description: 'Filter by user status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false, description: 'Filter by roles (comma-separated)' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? value.split(',').map((role: string) => role.trim()) : undefined)
  roles?: string[];

  @ApiProperty({ required: false, description: 'Filter by email (partial match)' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false, description: 'Filter by username (partial match)' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false, description: 'Filter by first name (partial match)' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false, description: 'Filter by last name (partial match)' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false, description: 'Sort by field' })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @ApiProperty({ required: false, enum: OrderTypes, description: 'Sort direction' })
  @IsOptional()
  @IsEnum(OrderTypes)
  orderType?: OrderTypes;

  @ApiProperty({ required: false, description: 'Maximum number of results' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiProperty({ required: false, description: 'Number of results to skip' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number;

  @ApiProperty({ required: false, description: 'Legacy: filter only active users' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onlyActive?: boolean;
}