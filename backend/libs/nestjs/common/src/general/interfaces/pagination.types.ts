import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { OrderTypes } from '../domain/criteria/OrderType';

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
  @IsOptional()
  limit?: number;

  @ApiProperty({ required: false, description: 'Number of results to skip' })
  @IsOptional()
  offset?: number;
}
