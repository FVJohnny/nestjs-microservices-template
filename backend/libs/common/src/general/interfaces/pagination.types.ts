import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { OrderTypes } from '../domain/criteria/order/OrderType';

export class ControllerPaginationParams {
@ApiProperty({ required: false, description: 'Sort by field' })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @ApiProperty({ required: false, enum: OrderTypes, description: 'Sort direction' })
  @IsOptional()
  @IsEnum(OrderTypes)
  orderType?: OrderTypes;

  @ApiProperty({ required: false, description: 'Maximum number of results' })
  limit?: number;

  @ApiProperty({ required: false, description: 'Number of results to skip' })
  offset?: number;
}
