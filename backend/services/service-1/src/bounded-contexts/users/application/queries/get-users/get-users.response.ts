import { ApiProperty } from '@nestjs/swagger';

export class GetUsersQueryResponse {
  @ApiProperty({ 
    example: ['123e4567-e89b-12d3-a456-426614174000', '456e7890-e12b-34c5-b678-901234567890'], 
    type: [String] 
  })
  ids: string[];
}