import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../../../domain/entities/user.entity';

export class UpdateUserProfileResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'johndoe' })
  username: string;

  @ApiProperty({ example: 'John' })
  firstName?: string;

  @ApiProperty({ example: 'Doe' })
  lastName?: string;

  @ApiProperty({ example: 'John Doe' })
  fullName: string;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ example: ['user'] })
  roles: string[];

  @ApiProperty({ example: { bio: 'Software developer', location: 'San Francisco' } })
  metadata?: Record<string, any>;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  updatedAt: Date;

  static fromEntity(user: User): UpdateUserProfileResponseDto {
    const primitives = user.toPrimitives();
    const response = new UpdateUserProfileResponseDto();
    
    response.id = primitives.id;
    response.email = primitives.email;
    response.username = primitives.username;
    response.firstName = primitives.firstName;
    response.lastName = primitives.lastName;
    response.fullName = `${primitives.firstName || ''} ${primitives.lastName || ''}`.trim() || primitives.username;
    response.status = primitives.status;
    response.roles = primitives.roles;
    response.metadata = primitives.metadata;
    response.createdAt = primitives.createdAt;
    response.updatedAt = primitives.updatedAt;
    
    return response;
  }
}