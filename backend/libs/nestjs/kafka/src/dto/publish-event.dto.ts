import { ApiProperty } from '@nestjs/swagger';

export class PublishEventDto {
  @ApiProperty({
    description: 'Event type identifier',
    example: 'user.registered',
    required: false
  })
  type?: string;

  @ApiProperty({
    description: 'User ID associated with the event',
    example: '123',
    required: false
  })
  userId?: string;

  @ApiProperty({
    description: 'Event timestamp',
    example: '2025-08-11T23:20:33.000Z',
    required: false
  })
  timestamp?: string;

  @ApiProperty({
    description: 'Additional event data',
    example: { email: 'user@example.com', action: 'signup' },
    required: false
  })
  data?: Record<string, any>;
}
