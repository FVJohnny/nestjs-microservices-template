import { ApiProperty } from '@nestjs/swagger';

export class SimulateMessageResponseDto {
  @ApiProperty({
    description: 'Whether the message simulation was successful',
    example: true,
  })
  success: boolean;

  constructor(success: boolean) {
    this.success = success;
  }
}
