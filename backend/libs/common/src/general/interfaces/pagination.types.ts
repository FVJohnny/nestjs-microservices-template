import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

import { OrderTypes } from '../domain/criteria/order/OrderType';

export class ControllerPaginationParams {
  @ApiProperty({ required: false, description: 'Sort by field' })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @ApiProperty({
    required: false,
    description: 'Sort direction',
  })
  @IsOptional()
  @IsString()
  orderType?: OrderTypes;

  @ApiProperty({ required: false, description: 'Maximum number of results' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @ApiProperty({ required: false, description: 'Number of results to skip' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;
}
