import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

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
  limit?: number;

  @ApiProperty({ required: false, description: 'Number of results to skip' })
  offset?: number;
}
